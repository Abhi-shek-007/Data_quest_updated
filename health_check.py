import requests
import sys
import json

def check_application_health():
    """Check if the application is running properly"""
    try:
        # Check main endpoint
        response = requests.get('http://127.0.0.1:5000/health', timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Application is running!")
            print(f"📊 Dataset records: {health_data.get('dataset_loaded', 0)}")
            print(f"🤖 Gemini AI: {health_data.get('gemini_ai', 'not configured')}")
            print(f"💾 Cached models: {health_data.get('cached_models', 0)}")
            print(f"💬 Active chats: {health_data.get('active_chat_sessions', 0)}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to application. Is it running?")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_prediction_api():
    """Test the prediction endpoint"""
    try:
        test_data = {"state": "Punjab", "soil": "Loam"}
        response = requests.post(
            'http://127.0.0.1:5000/predict',
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Prediction API working!")
            return True
        else:
            print(f"❌ Prediction API failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Prediction API test error: {e}")
        return False

def test_chat_api():
    """Test the chat endpoint"""
    try:
        test_message = {"message": "What is the best soil for rice?", "session_id": "test"}
        response = requests.post(
            'http://127.0.0.1:5000/chat',
            json=test_message,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Chat API working!")
            return True
        else:
            print(f"❌ Chat API failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Chat API test error: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Running application health checks...")
    print("-" * 40)
    
    all_tests_passed = True
    
    all_tests_passed &= check_application_health()
    all_tests_passed &= test_prediction_api()
    all_tests_passed &= test_chat_api()
    
    print("-" * 40)
    
    if all_tests_passed:
        print("🎉 All tests passed! Your application is ready to use.")
        print("🌐 Visit: http://127.0.0.1:5000")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
        sys.exit(1)