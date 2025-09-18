from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import os
from dotenv import load_dotenv
import google.generativeai as genai
import logging
import json
from datetime import datetime
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    MODEL_ID = "models/gemini-1.5-flash-8b"  

    try:
        model = genai.GenerativeModel(MODEL_ID)
        logger.info("Gemini AI model initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini AI: {e}")
        model = None
else:
    logger.warning("GOOGLE_API_KEY not found in environment variables")
    model = None

# Global variables for caching
trained_models = {}
dataset_cache = None
chat_sessions = {}

# Agriculture-focused content filter
AGRICULTURE_KEYWORDS = [
    'crop', 'farming', 'agriculture', 'rice', 'wheat', 'irrigation', 'fertilizer', 
    'soil', 'seed', 'harvest', 'yield', 'plant', 'cultivation', 'pesticide',
    'organic', 'compost', 'nitrogen', 'phosphorus', 'potassium', 'weather',
    'climate', 'season', 'monsoon', 'drought', 'flood', 'pest', 'disease',
    'fungus', 'bacteria', 'virus', 'insect', 'weed', 'herbicide', 'growth',
    'plantation', 'field', 'farm', 'farmer', 'agricultural', 'agronomy',
    'horticulture', 'livestock', 'dairy', 'poultry', 'aquaculture'
]

def load_dataset():
    """Load and cache the dataset"""
    global dataset_cache
    if dataset_cache is None:
        try:
            directory = os.getenv("DATASET_PATH", r"C:\Users\ASUS\OneDrive\Desktop\hackf.xlsx")
            dataset_cache = pd.read_excel(directory)
            logger.info(f"Dataset loaded successfully with {len(dataset_cache)} records")
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            dataset_cache = pd.DataFrame()
    return dataset_cache

def train_random_forest_model(state, soil):
    """Train and cache Random Forest model for specific state-soil combination"""
    model_key = f"{state}_{soil}"
    
    if model_key in trained_models:
        return trained_models[model_key]
    
    try:
        df = load_dataset()
        if df.empty:
            return None
            
        filtered = df[(df['State'] == state) & (df['Soil'] == soil)]
        
        if filtered.empty:
            logger.warning(f"No data found for state: {state}, soil: {soil}")
            return None
            
        X = filtered.iloc[:, :-1]
        y = filtered.iloc[:, -1]
        
        X_encoded = pd.get_dummies(X)
        
        if len(X_encoded) < 2:
            logger.warning(f"Insufficient data for training: {len(X_encoded)} samples")
            return None
        
        test_size = min(0.2, max(0.1, 1.0 / len(X_encoded)))
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y, test_size=test_size, random_state=100
        )
        
        rf = RandomForestRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=100,
            min_samples_split=2,
            min_samples_leaf=1
        )
        rf.fit(X_train, y_train)
        
        y_pred = rf.predict(X_test)
        
        model_data = {
            'model': rf,
            'predictions': y_pred.tolist(),
            'feature_columns': X_encoded.columns.tolist(),
            'train_score': rf.score(X_train, y_train),
            'test_score': rf.score(X_test, y_test) if len(X_test) > 0 else rf.score(X_train, y_train),
            'feature_importance': dict(zip(X_encoded.columns, rf.feature_importances_)),
            'sample_count': len(filtered)
        }
        
        trained_models[model_key] = model_data
        logger.info(f"Model trained successfully for {state}-{soil}. Test score: {model_data['test_score']:.3f}")
        
        return model_data
        
    except Exception as e:
        logger.error(f"Error training model for {state}-{soil}: {e}")
        return None

def is_agriculture_related(message):
    """Check if message is agriculture-related"""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in AGRICULTURE_KEYWORDS)

def get_model_insights(state, soil, user_context=None):
    """Get insights from trained model for chatbot responses"""
    try:
        model_data = train_random_forest_model(state, soil)
        if not model_data:
            return "I don't have specific data for that state-soil combination."
        
        insights = {
            'prediction_range': f"{min(model_data['predictions']):.2f} - {max(model_data['predictions']):.2f} tons/hectare",
            'average_yield': f"{sum(model_data['predictions']) / len(model_data['predictions']):.2f} tons/hectare",
            'model_confidence': f"{model_data['test_score']:.1%}",
            'sample_size': model_data['sample_count'],
            'top_factors': sorted(model_data['feature_importance'].items(), 
                                key=lambda x: x[1], reverse=True)[:3]
        }
        
        return insights
    except Exception as e:
        logger.error(f"Error getting model insights: {e}")
        return None

def generate_agriculture_response(message, session_id, user_context=None):
    """Generate agriculture-focused AI response with model insights"""
    if not model:
        return "AI service is currently unavailable. Please try again later."
    
    if not is_agriculture_related(message):
        return """I'm an agricultural expert focused on helping with farming and crop-related questions. 
Please ask me about topics like:
- Rice cultivation and yield optimization
- Soil management and fertilizers
- Irrigation techniques
- Crop diseases and pest control
- Weather and climate impacts on farming
- Harvest timing and post-harvest handling

How can I help you with your agricultural needs?"""
    
    try:
        # Get model insights if user context is provided
        model_context = ""
        if user_context and user_context.get('state') and user_context.get('soil'):
            insights = get_model_insights(user_context['state'], user_context['soil'])
            if insights and isinstance(insights, dict):
                model_context = f"""
Based on our predictive model for {user_context['state']} with {user_context['soil']} soil:
- Expected yield range: {insights['prediction_range']}
- Average predicted yield: {insights['average_yield']}
- Model confidence: {insights['model_confidence']}
- Data based on {insights['sample_size']} samples
- Key factors: {', '.join([factor[0] for factor in insights['top_factors']])}
"""
        
        # Create comprehensive agricultural prompt
        system_prompt = f"""You are an expert agricultural advisor specializing in crop cultivation, particularly rice farming. 
Your responses must be:
1. Strictly focused on agriculture, farming, and crop-related topics
2. Practical and actionable
3. Based on scientific agricultural principles
4. Helpful for farmers and agricultural professionals

{model_context}

User's question: {message}

Provide detailed, practical advice while staying within agricultural topics. If the question is not agriculture-related, politely redirect to farming topics."""

        # Get or create chat session
        if session_id not in chat_sessions:
            chat_sessions[session_id] = model.start_chat(history=[])
        
        chat = chat_sessions[session_id]
        response = chat.send_message(system_prompt)
        
        full_reply = ""
        for chunk in response:
            full_reply += chunk.text
        
        # Ensure response is agriculture-focused
        if not any(keyword in full_reply.lower() for keyword in AGRICULTURE_KEYWORDS[:10]):
            full_reply = f"Based on agricultural best practices: {full_reply}\n\nFor more specific advice about your crops, please provide details about your farming situation."
        
        logger.info(f"Agriculture response generated for session {session_id}")
        return full_reply
        
    except Exception as e:
        logger.error(f"Error generating agriculture response: {e}")
        return "I'm having trouble processing your request. Please try rephrasing your agricultural question."

# Route handlers
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        state = data.get('state')
        soil = data.get('soil')
        
        if not state or not soil:
            return jsonify({'error': 'State and soil parameters are required'}), 400
        
        model_data = train_random_forest_model(state, soil)
        
        if model_data is None:
            return jsonify({'error': f'Insufficient data for {state} with {soil} soil type'}), 404
        
        response_data = {
            'prediction': model_data['predictions'],
            'model_performance': {
                'train_score': model_data['train_score'],
                'test_score': model_data['test_score'],
                'sample_count': model_data['sample_count']
            },
            'feature_importance': dict(list(sorted(model_data['feature_importance'].items(), 
                                                 key=lambda x: x[1], reverse=True))[:5]),
            'state': state,
            'soil': soil,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/instructions', methods=['POST'])
def instructions():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        prediction = data.get('prediction')
        crop_data = data.get('crop_data', {})
        
        if not prediction:
            return jsonify({'error': 'Prediction data is required'}), 400
        
        # Get model insights
        insights = None
        if crop_data.get('state') and crop_data.get('soil'):
            insights = get_model_insights(crop_data['state'], crop_data['soil'])
        
        prompt = f"""As an expert agricultural advisor, provide comprehensive farming instructions based on:

Predicted Yield Values: {prediction}
Average Predicted Yield: {sum(prediction)/len(prediction):.2f} tons/hectare

Farm Details:
- State: {crop_data.get('state', 'Not specified')}
- Soil Type: {crop_data.get('soil', 'Not specified')}
- Land Area: {crop_data.get('land_area', 'Not specified')} hectares
- Irrigation: {crop_data.get('irrigation', 'Not specified')}
- Fertilizer: {crop_data.get('fertilizer', 'Not specified')}

"""
        
        if insights and isinstance(insights, dict):
            prompt += f"""
Model Analysis:
- Model Confidence: {insights['model_confidence']}
- Key Influencing Factors: {', '.join([f[0] for f in insights['top_factors']])}
- Data based on {insights['sample_size']} similar farms

"""
        
        prompt += """
Provide specific, actionable recommendations for:
1. Yield optimization strategies
2. Soil and nutrient management
3. Water and irrigation planning
4. Pest and disease prevention
5. Harvest timing and post-harvest handling
6. Market preparation advice

Keep advice practical and region-appropriate."""

        if model:
            chat = model.start_chat(history=[])
            response = chat.send_message(prompt)
            
            full_reply = ""
            for chunk in response:
                full_reply += chunk.text
        else:
            full_reply = "AI service unavailable. Please check your configuration."
        
        return jsonify({
            'instructions': full_reply,
            'model_insights': insights,
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Instructions generation error: {e}")
        return jsonify({'error': f'Failed to generate instructions: {str(e)}'}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        message = data.get('message', '').strip()
        session_id = data.get('session_id', 'default')
        user_context = data.get('context', {})
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        if len(message) > 1000:
            return jsonify({'error': 'Message too long. Please keep it under 1000 characters.'}), 400
        
        response_text = generate_agriculture_response(message, session_id, user_context)
        
        return jsonify({
            'response': response_text,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'is_agriculture_related': is_agriculture_related(message)
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({'error': 'Chat service temporarily unavailable'}), 500

@app.route('/chat/new', methods=['POST'])
def new_chat_session():
    """Create a new chat session"""
    try:
        import uuid
        session_id = str(uuid.uuid4())[:8]
        
        # Initialize with agriculture welcome message
        if model:
            chat_sessions[session_id] = model.start_chat(history=[])
        
        return jsonify({
            'session_id': session_id,
            'welcome_message': "Hello! I'm your agricultural advisor. I can help you with farming questions, especially about rice cultivation, soil management, irrigation, and crop optimization. What would you like to know?",
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"New chat session error: {e}")
        return jsonify({'error': 'Unable to create chat session'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'gemini_ai': 'configured' if model else 'not configured',
        'dataset_loaded': len(dataset_cache) if dataset_cache is not None else 0,
        'cached_models': len(trained_models),
        'active_chat_sessions': len(chat_sessions),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/dataset-info', methods=['GET'])
def dataset_info():
    try:
        df = load_dataset()
        
        if df.empty:
            return jsonify({'error': 'Dataset not loaded'}), 500
        
        info = {
            'total_records': len(df),
            'columns': df.columns.tolist(),
            'states': sorted(df['State'].unique().tolist()) if 'State' in df.columns else [],
            'soil_types': sorted(df['Soil'].unique().tolist()) if 'Soil' in df.columns else [],
            'data_shape': df.shape,
            'missing_values': df.isnull().sum().to_dict(),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(info)
        
    except Exception as e:
        logger.error(f"Dataset info error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load dataset on startup
    load_dataset()
    
    logger.info("Starting Rice Crop Prediction Application with AI Chatbot")
    
    app.run(
        debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true',
        host='127.0.0.1',
        port=int(os.getenv('PORT', 5000)),
        threaded=True
    )