from setuptools import setup, find_packages

setup(
    name="rice-crop-predictor",
    version="1.0.0",
    description="AI-Powered Rice Crop Yield Predictor with Intelligent Agricultural Advisor",
    packages=find_packages(),
    install_requires=[
        "Flask>=3.0.0",
        "Flask-CORS>=4.0.0", 
        "pandas>=2.1.0",
        "scikit-learn>=1.3.0",
        "google-generativeai>=0.3.0",
        "python-dotenv>=1.0.0",
        "openpyxl>=3.1.2",
        "numpy>=1.24.0"
    ],
    python_requires=">=3.8",
)