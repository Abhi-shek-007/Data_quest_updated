// Application data with empty initial historical records
const appData = {
    historical_records: [],
    ideal_conditions: {
        soil_type: "Loam",
        terrain: "Flat", 
        irrigation: "Drip",
        fertilizer_type: "NPK",
        fertilizer_quantity: 135,
        seed_type: "Hybrid",
        previous_crop: "Vegetables",
        theoretical_max_yield: 10.465
    },
    rice_growth_stages: {
        germination: {days: "0-10", description: "Seed sprouting and root development", icon: "🌱"},
        seedling: {days: "10-30", description: "Early leaf and shoot growth", icon: "🌿"},
        tillering: {days: "30-60", description: "Plant branching and tiller formation", icon: "🌾"},
        stem_elongation: {days: "60-80", description: "Rapid height increase and node development", icon: "🌱"},
        heading: {days: "80-100", description: "Panicle emergence and grain formation", icon: "🌾"},
        maturity: {days: "100-120", description: "Grain filling and harvest readiness", icon: "🌾"}
    },
    soil_base_yields: {
        "Clay": 3.5, "Loam": 4.0, "Sandy": 2.8, "Silt": 3.2, "Peat": 3.8
    },
    irrigation_multipliers: {
        "Flood": 1.2, "Drip": 1.4, "Sprinkler": 1.3, "Rain-fed": 0.8, "Furrow": 1.1
    },
    terrain_adjustments: {
        "Flat": 1.0, "Gentle Slope": 0.95, "Steep Slope": 0.85, "Valley": 1.1, "Plateau": 0.9
    },
    fertilizer_effects: {
        "NPK": 1.3, "Urea": 1.2, "DAP": 1.25, "Organic": 1.15, "Compost": 1.1, "None": 0.7
    },
    seed_bonuses: {"Hybrid": 1.25, "Normal": 1.0},
    previous_crop_effects: {
        "None": 1.0, "Rice": 0.9, "Wheat": 1.1, "Sugarcane": 0.95, "Cotton": 1.05, "Vegetables": 1.15
    },
    rice_price_per_ton: 50000,
    optimization_priorities: {
        "soil_improvement": {
            "impact": "High", "description": "Switch to loam soil or improve soil composition",
            "potential_increase": "15-25%", "investment": "Medium to High", "timeline": "6-12 months"
        },
        "irrigation_upgrade": {
            "impact": "High", "description": "Upgrade to drip irrigation system",
            "potential_increase": "10-20%", "investment": "High", "timeline": "2-4 months"
        },
        "hybrid_seeds": {
            "impact": "Medium", "description": "Use hybrid seed varieties",
            "potential_increase": "20-25%", "investment": "Low", "timeline": "Next planting season"
        },
        "fertilizer_optimization": {
            "impact": "Medium", "description": "Optimize fertilizer type and quantity",
            "potential_increase": "10-15%", "investment": "Low to Medium", "timeline": "Current season"
        },
        "crop_rotation": {
            "impact": "Low", "description": "Implement proper crop rotation",
            "potential_increase": "5-10%", "investment": "Low", "timeline": "Next 2-3 seasons"
        }
    }
};

// Global variables
let currentPrediction = null;
let yieldComparisonChart = null;
let efficiencyGaugeChart = null;
let conditionsRadarChart = null;
let currentChatSession = null;
let userContext = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing AI-Powered Rice Crop Predictor with Chatbot...');
    
    displayHistoricalData(appData.historical_records);
    setupEventListeners();
    initializeChatbot();
    
    const today = new Date().toISOString().split('T')[0];
    const plantingDateInput = document.getElementById('plantingDate');
    if (plantingDateInput) {
        plantingDateInput.value = today;
    }
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    const cropForm = document.getElementById('cropForm');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const fertilizerTypeSelect = document.getElementById('fertilizerType');
    
    if (cropForm) {
        cropForm.addEventListener('submit', handleFormSubmission);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
    
    if (fertilizerTypeSelect) {
        fertilizerTypeSelect.addEventListener('change', updateFertilizerQuantity);
    }

    // Chat event listeners
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChatSession);
    }
}

async function initializeChatbot() {
    try {
        const response = await fetch('/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.session_id) {
            currentChatSession = data.session_id;
            if (data.welcome_message) {
                displayChatMessage(data.welcome_message, 'bot');
            }
        }
    } catch (error) {
        console.error('Failed to initialize chatbot:', error);
        displayChatMessage('Welcome! I\'m your agricultural advisor. Ask me about farming and crop cultivation.', 'bot');
    }
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Display user message
    displayChatMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    showChatTyping(true);
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: currentChatSession || 'default',
                context: userContext
            })
        });
        
        const data = await response.json();
        
        if (data.response) {
            displayChatMessage(data.response, 'bot');
            
            if (data.session_id) {
                currentChatSession = data.session_id;
            }
            
            if (!data.is_agriculture_related) {
                displayChatMessage('💡 Tip: I\'m specialized in agricultural advice. Try asking about crops, farming techniques, or soil management!', 'system');
            }
        } else if (data.error) {
            displayChatMessage(`Sorry, I encountered an error: ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Chat error:', error);
        displayChatMessage('I\'m having trouble connecting. Please try again.', 'error');
    } finally {
        showChatTyping(false);
    }
}

function displayChatMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender);
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let icon = '';
    switch(sender) {
        case 'user':
            icon = '👤';
            break;
        case 'bot':
            icon = '🤖';
            break;
        case 'system':
            icon = 'ℹ️';
            break;
        case 'error':
            icon = '⚠️';
            break;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-icon">${icon}</span>
            <span class="message-time">${timestamp}</span>
        </div>
        <div class="message-content">${message}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showChatTyping(show) {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = show ? 'block' : 'none';
    }
}

async function startNewChatSession() {
    try {
        const response = await fetch('/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.session_id) {
            currentChatSession = data.session_id;
            
            // Clear chat messages
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            
            // Display welcome message
            if (data.welcome_message) {
                displayChatMessage(data.welcome_message, 'bot');
            }
        }
    } catch (error) {
        console.error('Failed to start new chat session:', error);
        displayChatMessage('Failed to start new conversation. Please try again.', 'error');
    }
}

function updateFertilizerQuantity() {
    const fertilizerType = document.getElementById('fertilizerType').value;
    const fertilizerQuantity = document.getElementById('fertilizerQuantity');
    
    const typicalQuantities = {
        'NPK': 135, 'Urea': 100, 'DAP': 80, 'Organic': 150, 'Compost': 200, 'None': 0
    };
    
    if (fertilizerType && typicalQuantities[fertilizerType] !== undefined) {
        fertilizerQuantity.value = typicalQuantities[fertilizerType];
    }
}

async function handleFormSubmission(e) {
    e.preventDefault();
    console.log('Form submission started');
    showLoadingState(true);

    const formData = new FormData(e.target);
    const cropData = {
        farmerName: formData.get('farmerName') || document.getElementById('farmerName').value,
        landArea: parseFloat(formData.get('landArea') || document.getElementById('landArea').value),
        soilType: formData.get('soilType') || document.getElementById('soilType').value,
        terrainType: formData.get('terrainType') || document.getElementById('terrainType').value,
        irrigationMethod: formData.get('irrigationMethod') || document.getElementById('irrigationMethod').value,
        fertilizerType: formData.get('fertilizerType') || document.getElementById('fertilizerType').value,
        fertilizerQuantity: parseInt(formData.get('fertilizerQuantity') || document.getElementById('fertilizerQuantity').value),
        seedType: formData.get('seedType') || document.querySelector('input[name="seedType"]:checked')?.value,
        previousCrop: formData.get('previousCrop') || document.getElementById('previousCrop').value,
        plantingDate: formData.get('plantingDate') || document.getElementById('plantingDate').value,
        state: formData.get('state') || document.getElementById('state')?.value
    };

    console.log('Collected form data:', cropData);

    // Update user context for chatbot
    userContext = {
        state: cropData.state,
        soil: cropData.soilType,
        land_area: cropData.landArea,
        irrigation: cropData.irrigationMethod,
        fertilizer: cropData.fertilizerType
    };

    const requiredFields = ['farmerName', 'landArea', 'soilType', 'terrainType', 'irrigationMethod', 
                           'fertilizerType', 'seedType', 'previousCrop', 'plantingDate', 'state'];

    const missingFields = requiredFields.filter(field => !cropData[field]);

    if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        showLoadingState(false);
        return;
    }

    let predictionResult = null;
    let modelInsights = null;
    
    try {
        const predRes = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: cropData.state, soil: cropData.soilType })
        });
        
        const predJson = await predRes.json();
        
        if (predRes.ok && predJson.prediction) {
            predictionResult = predJson.prediction;
            modelInsights = predJson.feature_importance;
            
            // Display model insights in chat
            if (currentChatSession) {
                const insightsMessage = `📊 **Model Analysis for ${cropData.state} with ${cropData.soilType} soil:**
- Predicted yield range: ${Math.min(...predictionResult).toFixed(2)} - ${Math.max(...predictionResult).toFixed(2)} tons/hectare
- Model accuracy: ${(predJson.model_performance.test_score * 100).toFixed(1)}%
- Based on ${predJson.model_performance.sample_count} similar cases
- Key factors: ${Object.keys(modelInsights || {}).slice(0, 3).join(', ')}`;
                displayChatMessage(insightsMessage, 'system');
            }
        } else {
            alert(predJson.error || 'Prediction failed');
            showLoadingState(false);
            return;
        }
    } catch (err) {
        console.error('Prediction API error:', err);
        alert('Error connecting to prediction service');
        showLoadingState(false);
        return;
    }

    let instructionsText = '';
    try {
        const instrRes = await fetch('/instructions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prediction: predictionResult,
                crop_data: {
                    state: cropData.state,
                    soil: cropData.soilType,
                    land_area: cropData.landArea,
                    irrigation: cropData.irrigationMethod,
                    fertilizer: cropData.fertilizerType
                }
            })
        });
        
        const instrJson = await instrRes.json();
        
        if (instrRes.ok && instrJson.instructions) {
            instructionsText = instrJson.instructions;
        } else {
            console.error('Instructions generation failed:', instrJson.error);
            instructionsText = 'Instructions generation temporarily unavailable.';
        }
    } catch (err) {
        console.error('Instructions API error:', err);
        instructionsText = 'Unable to generate instructions at this time.';
    }

    displayInstructions(instructionsText);

    const prediction = calculateYieldPrediction(cropData);
    const timeline = calculateGrowthTimeline(cropData.plantingDate);
    currentPrediction = { ...cropData, ...prediction, ...timeline };
    
    displayResults(currentPrediction);
    displayTimeline(timeline);
    createCharts(currentPrediction);
    addToHistoricalData(currentPrediction);
    resetForm();
    showLoadingState(false);
    
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function displayInstructions(text) {
    let instructionsDiv = document.getElementById('instructionsDiv');
    if (!instructionsDiv) {
        instructionsDiv = document.createElement('div');
        instructionsDiv.id = 'instructionsDiv';
        instructionsDiv.className = 'instructions-container';
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.parentNode.insertBefore(instructionsDiv, resultsSection.nextSibling);
        } else {
            document.body.appendChild(instructionsDiv);
        }
    }
    
    instructionsDiv.innerHTML = `
        <div class="card instructions-card">
            <div class="card__header">
                <h3><i class="fas fa-lightbulb"></i> AI-Generated Farming Instructions</h3>
            </div>
            <div class="card__body">
                <div class="instructions-content">${text.replace(/\n/g, '<br>')}</div>
                <div class="instructions-actions">
                    <button onclick="copyInstructions()" class="btn btn--outline btn--sm">
                        <i class="fas fa-copy"></i> Copy Instructions
                    </button>
                    <button onclick="askAboutInstructions()" class="btn btn--primary btn--sm">
                        <i class="fas fa-comments"></i> Ask Questions in Chat
                    </button>
                </div>
            </div>
        </div>
    `;
}

function copyInstructions() {
    const instructionsContent = document.querySelector('.instructions-content');
    if (instructionsContent) {
        const text = instructionsContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Instructions copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy instructions');
        });
    }
}

function askAboutInstructions() {
    const chatSection = document.getElementById('chatSection');
    if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth' });
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.focus();
            chatInput.placeholder = 'Ask me about the farming instructions or any related questions...';
        }
    }
}

// Keep all your existing functions (calculateYieldPrediction, displayResults, etc.)
function calculateYieldPrediction(cropData) {
    let baseYield = appData.soil_base_yields[cropData.soilType] || 3.0;
    baseYield *= appData.terrain_adjustments[cropData.terrainType] || 1.0;
    baseYield *= appData.irrigation_multipliers[cropData.irrigationMethod] || 1.0;
    baseYield *= appData.fertilizer_effects[cropData.fertilizerType] || 1.0;
    baseYield *= appData.seed_bonuses[cropData.seedType] || 1.0;
    baseYield *= appData.previous_crop_effects[cropData.previousCrop] || 1.0;
    
    const fertilizerBonus = Math.min(cropData.fertilizerQuantity / 135 * 0.15, 0.25);
    baseYield *= (1 + fertilizerBonus);
    
    const randomFactor = 0.95 + Math.random() * 0.1;
    const predictedYield = baseYield * randomFactor;
    
    const idealYield = appData.ideal_conditions.theoretical_max_yield;
    const efficiency = Math.min((predictedYield / idealYield) * 100, 100);
    
    const totalYield = predictedYield * cropData.landArea;
    const expectedIncome = totalYield * appData.rice_price_per_ton;
    const potentialIncome = idealYield * cropData.landArea * appData.rice_price_per_ton;
    
    const recommendations = generateOptimizationRoadmap(cropData, predictedYield, idealYield);
    
    return {
        predictedYield: Math.round(predictedYield * 100) / 100,
        idealYield: Math.round(idealYield * 100) / 100,
        totalYield: Math.round(totalYield * 100) / 100,
        expectedIncome: Math.round(expectedIncome),
        potentialIncome: Math.round(potentialIncome),
        efficiency: Math.round(efficiency * 10) / 10,
        yieldGap: Math.round((idealYield - predictedYield) * 100) / 100,
        recommendations,
        confidenceLevel: calculateConfidence(cropData)
    };
}

function calculateGrowthTimeline(plantingDate) {
    const plantDate = new Date(plantingDate);
    const today = new Date();
    const daysSincePlanting = Math.floor((today - plantDate) / (1000 * 60 * 60 * 24));
    
    const harvestDate = new Date(plantDate);
    harvestDate.setDate(harvestDate.getDate() + 110);
    
    const daysToHarvest = Math.max(0, Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24)));
    
    let currentStage = 'germination';
    let stageProgress = 0;
    
    if (daysSincePlanting >= 0 && daysSincePlanting <= 10) {
        currentStage = 'germination';
        stageProgress = (daysSincePlanting / 10) * 100;
    } else if (daysSincePlanting <= 30) {
        currentStage = 'seedling';
        stageProgress = ((daysSincePlanting - 10) / 20) * 100;
    } else if (daysSincePlanting <= 60) {
        currentStage = 'tillering';
        stageProgress = ((daysSincePlanting - 30) / 30) * 100;
    } else if (daysSincePlanting <= 80) {
        currentStage = 'stem_elongation';
        stageProgress = ((daysSincePlanting - 60) / 20) * 100;
    } else if (daysSincePlanting <= 100) {
        currentStage = 'heading';
        stageProgress = ((daysSincePlanting - 80) / 20) * 100;
    } else if (daysSincePlanting <= 120) {
        currentStage = 'maturity';
        stageProgress = ((daysSincePlanting - 100) / 20) * 100;
    } else {
        currentStage = 'harvest_ready';
        stageProgress = 100;
    }
    
    return {
        plantingDate: plantingDate,
        currentStage: currentStage,
        stageProgress: Math.min(stageProgress, 100),
        daysSincePlanting: Math.max(0, daysSincePlanting),
        daysToHarvest: daysToHarvest,
        expectedHarvest: harvestDate.toLocaleDateString('en-IN'),
        harvestDate: harvestDate
    };
}

function displayTimeline(timeline) {
    const timelineContainer = document.getElementById('timelineContainer');
    const daysToHarvestEl = document.getElementById('daysToHarvest');
    const currentStageEl = document.getElementById('currentStage');
    const expectedHarvestEl = document.getElementById('expectedHarvest');
    
    if (daysToHarvestEl) daysToHarvestEl.textContent = `${timeline.daysToHarvest} days`;
    if (currentStageEl) {
        const stageName = appData.rice_growth_stages[timeline.currentStage]?.description || timeline.currentStage;
        currentStageEl.textContent = stageName;
    }
    if (expectedHarvestEl) expectedHarvestEl.textContent = timeline.expectedHarvest;
    
    if (timelineContainer) {
        timelineContainer.innerHTML = '';
        
        const stages = ['germination', 'seedling', 'tillering', 'stem_elongation', 'heading', 'maturity'];
        
        stages.forEach(stage => {
            const stageData = appData.rice_growth_stages[stage];
            const stageEl = document.createElement('div');
            stageEl.className = 'timeline-stage';
            
            let stageClass = 'future';
            if (timeline.daysSincePlanting > 120) {
                stageClass = 'completed';
            } else if (stage === timeline.currentStage) {
                stageClass = 'active';
            } else {
                const stageOrder = stages.indexOf(stage);
                const currentOrder = stages.indexOf(timeline.currentStage);
                if (stageOrder < currentOrder) {
                    stageClass = 'completed';
                }
            }
            
            stageEl.classList.add(stageClass);
            
            stageEl.innerHTML = `
                <div class="timeline-icon">${stageData.icon}</div>
                <div class="timeline-info">
                    <div class="timeline-label">${stage.replace('_', ' ')}</div>
                    <div class="timeline-days">${stageData.days} days</div>
                </div>
            `;
            
            timelineContainer.appendChild(stageEl);
        });
    }
}

function createCharts(predictionData) {
    createYieldComparisonChart(predictionData);
    createEfficiencyGaugeChart(predictionData);
    createConditionsRadarChart(predictionData);
}

function createYieldComparisonChart(data) {
    const ctx = document.getElementById('yieldComparisonChart');
    if (!ctx) return;
    
    if (yieldComparisonChart) {
        yieldComparisonChart.destroy();
    }
    
    yieldComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Your Yield', 'Ideal Yield'],
            datasets: [{
                label: 'Yield (tons/hectare)',
                data: [data.predictedYield, data.idealYield],
                backgroundColor: ['#1FB8CD', '#FFC185'],
                borderColor: ['#1FB8CD', '#FFC185'],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} tons/hectare`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(data.idealYield * 1.1, 12),
                    title: { display: true, text: 'Yield (tons/hectare)' }
                }
            }
        }
    });
}

function createEfficiencyGaugeChart(data) {
    const ctx = document.getElementById('efficiencyGaugeChart');
    if (!ctx) return;
    
    if (efficiencyGaugeChart) {
        efficiencyGaugeChart.destroy();
    }
    
    const efficiency = data.efficiency;
    const remaining = 100 - efficiency;
    
    efficiencyGaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Efficiency', 'Potential'],
            datasets: [{
                data: [efficiency, remaining],
                backgroundColor: ['#1FB8CD', '#ECEBD5'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            }
        },
        plugins: [{
            beforeDraw: function(chart) {
                const width = chart.width;
                const height = chart.height;
                const ctx = chart.ctx;
                
                ctx.restore();
                const fontSize = (height / 114).toFixed(2);
                ctx.font = `bold ${fontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#333";
                
                const text = `${efficiency.toFixed(1)}%`;
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 2;
                
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}

function createConditionsRadarChart(data) {
    const ctx = document.getElementById('conditionsRadarChart');
    if (!ctx) return;
    
    if (conditionsRadarChart) {
        conditionsRadarChart.destroy();
    }
    
    const conditions = {
        'Soil Quality': getSoilScore(data.soilType),
        'Irrigation': getIrrigationScore(data.irrigationMethod),
        'Terrain': getTerrainScore(data.terrainType),
        'Fertilizer': getFertilizerScore(data.fertilizerType, data.fertilizerQuantity),
        'Seed Quality': getSeedScore(data.seedType),
        'Crop Rotation': getCropRotationScore(data.previousCrop)
    };
    
    const idealScores = [100, 100, 100, 100, 100, 100];
    const currentScores = Object.values(conditions);
    
    conditionsRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(conditions),
            datasets: [{
                label: 'Your Conditions',
                data: currentScores,
                backgroundColor: 'rgba(31, 184, 205, 0.2)',
                borderColor: '#1FB8CD',
                pointBackgroundColor: '#1FB8CD',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#1FB8CD'
            }, {
                label: 'Ideal Conditions',
                data: idealScores,
                backgroundColor: 'rgba(255, 193, 133, 0.1)',
                borderColor: '#FFC185',
                pointBackgroundColor: '#FFC185',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#FFC185'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: { line: { borderWidth: 3 } },
            scales: {
                r: {
                    angleLines: { display: false },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

function getSoilScore(soilType) {
    const scores = { 'Loam': 100, 'Clay': 87, 'Peat': 95, 'Silt': 80, 'Sandy': 70 };
    return scores[soilType] || 50;
}

function getIrrigationScore(irrigation) {
    const scores = { 'Drip': 100, 'Sprinkler': 93, 'Flood': 86, 'Furrow': 79, 'Rain-fed': 57 };
    return scores[irrigation] || 50;
}

function getTerrainScore(terrain) {
    const scores = { 'Flat': 100, 'Valley': 100, 'Gentle Slope': 95, 'Plateau': 90, 'Steep Slope': 85 };
    return scores[terrain] || 50;
}

function getFertilizerScore(type, quantity) {
    const typeScores = { 'NPK': 100, 'DAP': 96, 'Urea': 92, 'Organic': 88, 'Compost': 84, 'None': 0 };
    const baseScore = typeScores[type] || 50;
    
    if (type === 'None') return 0;
    
    const quantityFactor = Math.min(quantity / 135, 1.5);
    return Math.min(baseScore * quantityFactor, 100);
}

function getSeedScore(seedType) {
    return seedType === 'Hybrid' ? 100 : 80;
}

function getCropRotationScore(previousCrop) {
    const scores = { 'Vegetables': 100, 'Wheat': 96, 'Cotton': 91, 'None': 87, 'Sugarcane': 83, 'Rice': 78 };
    return scores[previousCrop] || 70;
}

function generateOptimizationRoadmap(cropData, predictedYield, idealYield) {
    const recommendations = [];
    
    if (cropData.soilType !== 'Loam') {
        const priority = appData.optimization_priorities.soil_improvement;
        recommendations.push({
            text: priority.description,
            impact: priority.impact,
            increase: priority.potential_increase,
            timeline: priority.timeline,
            investment: priority.investment
        });
    }
    
    if (cropData.irrigationMethod !== 'Drip') {
        const priority = appData.optimization_priorities.irrigation_upgrade;
        recommendations.push({
            text: priority.description,
            impact: priority.impact,
            increase: priority.potential_increase,
            timeline: priority.timeline,
            investment: priority.investment
        });
    }
    
    if (cropData.seedType !== 'Hybrid') {
        const priority = appData.optimization_priorities.hybrid_seeds;
        recommendations.push({
            text: priority.description,
            impact: priority.impact,
            increase: priority.potential_increase,
            timeline: priority.timeline,
            investment: priority.investment
        });
    }
    
    if (cropData.fertilizerType !== 'NPK' || cropData.fertilizerQuantity < 120) {
        const priority = appData.optimization_priorities.fertilizer_optimization;
        recommendations.push({
            text: priority.description,
            impact: priority.impact,
            increase: priority.potential_increase,
            timeline: priority.timeline,
            investment: priority.investment
        });
    }
    
    if (cropData.previousCrop === 'Rice') {
        const priority = appData.optimization_priorities.crop_rotation;
        recommendations.push({
            text: priority.description,
            impact: priority.impact,
            increase: priority.potential_increase,
            timeline: priority.timeline,
            investment: priority.investment
        });
    }
    
    const efficiency = (predictedYield / idealYield) * 100;
    if (efficiency < 40) {
        recommendations.push({
            text: "Consider consulting with agricultural extension services for comprehensive farm assessment",
            impact: "High",
            increase: "20-30%",
            timeline: "Immediate",
            investment: "Low"
        });
    } else if (efficiency < 70) {
        recommendations.push({
            text: "Focus on soil testing and precision agriculture techniques",
            impact: "Medium",
            increase: "10-15%",
            timeline: "1-2 months",
            investment: "Medium"
        });
    }
    
    return recommendations.slice(0, 5);
}

function calculateConfidence(cropData) {
    let confidence = 85;
    
    if (cropData.irrigationMethod === 'Drip') confidence += 5;
    else if (cropData.irrigationMethod === 'Rain-fed') confidence -= 10;
    
    if (cropData.seedType === 'Hybrid') confidence += 3;
    if (cropData.fertilizerType === 'None') confidence -= 8;
    else if (cropData.fertilizerType === 'NPK') confidence += 2;
    
    if (cropData.soilType === 'Loam') confidence += 3;
    else if (cropData.soilType === 'Sandy') confidence -= 5;
    
    return Math.min(Math.max(confidence, 60), 95);
}

function displayResults(prediction) {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.classList.remove('hidden');
    }
    
    const predictedYieldEl = document.getElementById('predictedYield');
    const confidenceLevelEl = document.getElementById('confidenceLevel');
    const efficiencyPercentEl = document.getElementById('efficiencyPercent');
    
    if (predictedYieldEl) predictedYieldEl.textContent = `${prediction.predictedYield} tons/hectare`;
    if (confidenceLevelEl) confidenceLevelEl.textContent = `Accuracy: ${prediction.confidenceLevel}%`;
    if (efficiencyPercentEl) efficiencyPercentEl.textContent = `Efficiency: ${prediction.efficiency}%`;
    
    const expectedIncomeEl = document.getElementById('expectedIncome');
    const incomePerHaEl = document.getElementById('incomePerHectare');
    const potentialIncomeEl = document.getElementById('potentialIncome');
    
    if (expectedIncomeEl && incomePerHaEl && potentialIncomeEl) {
        const expectedIncomeFormatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(prediction.expectedIncome);
        
        const incomePerHa = Math.round(prediction.expectedIncome / prediction.landArea);
        const incomePerHaFormatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(incomePerHa);
        
        const potentialIncomeFormatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(prediction.potentialIncome);
        
        const incomeIncrease = ((prediction.potentialIncome - prediction.expectedIncome) / prediction.expectedIncome * 100).toFixed(1);
        
        expectedIncomeEl.textContent = expectedIncomeFormatted;
        incomePerHaEl.textContent = `${incomePerHaFormatted} per hectare`;
        potentialIncomeEl.textContent = `Potential: ${potentialIncomeFormatted} (+${incomeIncrease}%)`;
    }
    
    const yieldGapEl = document.getElementById('yieldGap');
    const gapPercentageEl = document.getElementById('gapPercentage');
    const improvementPotentialEl = document.getElementById('improvementPotential');
    
    if (yieldGapEl) yieldGapEl.textContent = `${prediction.yieldGap} tons/ha`;
    if (gapPercentageEl) {
        const gapPercentage = ((prediction.yieldGap / prediction.idealYield) * 100).toFixed(1);
        gapPercentageEl.textContent = `${gapPercentage}% below ideal`;
    }
    if (improvementPotentialEl) {
        improvementPotentialEl.textContent = `${(100 - prediction.efficiency).toFixed(1)}% improvement possible`;
    }
    
    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList && prediction.recommendations) {
        recommendationsList.innerHTML = '';
        prediction.recommendations.forEach((rec, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="recommendation-text">${rec.text}</div>
                <div class="recommendation-impact">
                    <span class="impact-label">${rec.impact} Impact</span>
                    <span class="increase-potential">+${rec.increase}</span>
                    <span class="timeline-label">${rec.timeline}</span>
                </div>
            `;
            recommendationsList.appendChild(li);
        });
    }
}

function addToHistoricalData(predictionData) {
    const newRecord = {
        id: appData.historical_records.length + 1,
        date: predictionData.plantingDate,
        farmer_name: predictionData.farmerName,
        land_area: predictionData.landArea,
        soil_type: predictionData.soilType,
        terrain: predictionData.terrainType,
        irrigation: predictionData.irrigationMethod,
        fertilizer_type: predictionData.fertilizerType,
        fertilizer_quantity: predictionData.fertilizerQuantity,
        seed_type: predictionData.seedType,
        previous_crop: predictionData.previousCrop,
        predicted_yield: predictionData.predictedYield,
        efficiency: predictionData.efficiency,
        income: predictionData.expectedIncome,
        harvest_date: predictionData.expectedHarvest
    };
    
    appData.historical_records.push(newRecord);
    displayHistoricalData(appData.historical_records);
    
    const emptyState = document.getElementById('emptyState');
    const tableControls = document.getElementById('tableControls');
    const tableContainer = document.getElementById('tableContainer');
    
    if (emptyState) emptyState.classList.add('hidden');
    if (tableControls) tableControls.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
}

function displayHistoricalData(records) {
    const historicalTableBody = document.getElementById('historicalTableBody');
    if (!historicalTableBody) return;
    
    historicalTableBody.innerHTML = '';
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        const formattedIncome = new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(record.income);
        
        row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
            <td>${record.farmer_name}</td>
            <td>${record.land_area}</td>
            <td>${record.soil_type}</td>
            <td>${record.irrigation}</td>
            <td>${record.fertilizer_type}</td>
            <td>${record.predicted_yield.toFixed(1)}</td>
            <td>${record.efficiency.toFixed(1)}%</td>
            <td>₹${formattedIncome}</td>
        `;
        
        historicalTableBody.appendChild(row);
    });
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayHistoricalData(appData.historical_records);
        return;
    }
    
    const filteredRecords = appData.historical_records.filter(record => 
        record.farmer_name.toLowerCase().includes(searchTerm) ||
        record.soil_type.toLowerCase().includes(searchTerm) ||
        record.irrigation.toLowerCase().includes(searchTerm) ||
        record.fertilizer_type.toLowerCase().includes(searchTerm)
    );
    
    displayHistoricalData(filteredRecords);
}

function handleSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    const sortBy = sortSelect.value;
    const sortedRecords = [...appData.historical_records].sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortBy === 'farmer_name') {
            return a.farmer_name.localeCompare(b.farmer_name);
        } else if (sortBy === 'actual_yield') {
            return b.predicted_yield - a.predicted_yield;
        } else if (sortBy === 'income') {
            return b.income - a.income;
        }
        return 0;
    });
    
    displayHistoricalData(sortedRecords);
}

function showLoadingState(loading) {
    const predictBtn = document.querySelector('.predict-btn');
    if (!predictBtn) return;
    
    if (loading) {
        predictBtn.classList.add('loading');
        predictBtn.disabled = true;
    } else {
        predictBtn.classList.remove('loading');
        predictBtn.disabled = false;
    }
}

function resetForm() {
    const cropForm = document.getElementById('cropForm');
    if (cropForm) {
        cropForm.reset();
        const plantingDateInput = document.getElementById('plantingDate');
        if (plantingDateInput) {
            plantingDateInput.value = new Date().toISOString().split('T')[0];
        }
    }
}

function exportResults() {
    if (!currentPrediction) {
        alert('No prediction results to export');
        return;
    }
    
    const exportData = `
AI-POWERED RICE CROP YIELD PREDICTION REPORT
==========================================

Generated on: ${new Date().toLocaleString('en-IN')}

FARMER INFORMATION:
- Name: ${currentPrediction.farmerName}
- Land Area: ${currentPrediction.landArea} hectares
- Planting Date: ${currentPrediction.plantingDate}

FIELD CONDITIONS:
- Soil Type: ${currentPrediction.soilType}
- Terrain: ${currentPrediction.terrainType}
- Irrigation: ${currentPrediction.irrigationMethod}
- Fertilizer: ${currentPrediction.fertilizerType} (${currentPrediction.fertilizerQuantity} kg/ha)
- Seed Type: ${currentPrediction.seedType}
- Previous Crop: ${currentPrediction.previousCrop}

PREDICTION RESULTS:
- Predicted Yield: ${currentPrediction.predictedYield} tons/hectare
- Ideal Yield: ${currentPrediction.idealYield} tons/hectare
- Efficiency: ${currentPrediction.efficiency}%
- Total Expected Yield: ${currentPrediction.totalYield} tons
- Expected Income: ₹${currentPrediction.expectedIncome.toLocaleString('en-IN')}
- Potential Income: ₹${currentPrediction.potentialIncome.toLocaleString('en-IN')}
- Yield Gap: ${currentPrediction.yieldGap} tons/hectare
- Confidence Level: ${currentPrediction.confidenceLevel}%

HARVEST TIMELINE:
- Current Growth Stage: ${currentPrediction.currentStage}
- Days to Harvest: ${currentPrediction.daysToHarvest}
- Expected Harvest Date: ${currentPrediction.expectedHarvest}

OPTIMIZATION ROADMAP:
${currentPrediction.recommendations.map((rec, index) => 
    `${index + 1}. ${rec.text}
       Impact: ${rec.impact} | Increase: ${rec.increase} | Timeline: ${rec.timeline}`
).join('\n')}

This report provides recommendations to optimize your rice crop yield.
For detailed guidance, consult with local agricultural extension services.
`;
    
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rice-crop-prediction-${currentPrediction.farmerName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function startNewPrediction() {
    resetForm();
    
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.classList.add('hidden');
    }
    
    // Clear instructions
    const instructionsDiv = document.getElementById('instructionsDiv');
    if (instructionsDiv) {
        instructionsDiv.remove();
    }
    
    // Destroy existing charts
    if (yieldComparisonChart) {
        yieldComparisonChart.destroy();
        yieldComparisonChart = null;
    }
    if (efficiencyGaugeChart) {
        efficiencyGaugeChart.destroy();
        efficiencyGaugeChart = null;
    }
    if (conditionsRadarChart) {
        conditionsRadarChart.destroy();
        conditionsRadarChart = null;
    }
    
    currentPrediction = null;
    userContext = {};
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const farmerNameInput = document.getElementById('farmerName');
    if (farmerNameInput) {
        setTimeout(() => farmerNameInput.focus(), 100);
    }
}