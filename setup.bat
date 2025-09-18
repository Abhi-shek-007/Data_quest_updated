@echo off

echo Setting up Rice Crop Predictor with AI Chatbot...

rem Create project structure
mkdir templates static\css static\js data logs

rem Create virtual environment
python -m venv venv
call venv\Scripts\activate

rem Install dependencies
pip install -r requirements.txt

echo Setup complete! Don't forget to:
echo 1. Create .env file with your GOOGLE_API_KEY
echo 2. Move your files to correct directories  
echo 3. Run: python app.py

pause