Here’s your updated README with the YouTube link added under a new section:

---

# AI-Driven Air Quality Prediction and Alerts 🚦🌫️

## 📌 Project Overview

This project focuses on providing real-time, personalized air quality predictions and alerts tailored for asthma patients. Using IoT sensors and AI models, it offers a proactive healthcare solution to track pollution exposure and send timely warnings based on user-specific thresholds.

## 🧠 Core Features

* **Real-Time Monitoring**: Uses PMS5003 and Grove Multichannel Gas Sensor V2 to collect PM2.5, PM10, CO, NO2, and VOC data.
* **Predictive Modeling**: Implements XGBoost wrapped in MultiOutputRegressor for multi-pollutant forecasting.
* **Cloud Integration**: Sensor data is sent via ESP32-WROVER-B to Supabase for storage and processing.
* **Mobile Deployment**: Each device acts as a micro-station, contributing to a crowdsourced, street-level AQI map.
* **Personalized Alerts**: Thresholds are aligned with asthma severity categories and Indian AQI standards.
* **Interactive Dashboard**: Displays real-time AQI, pollutant trends, and personalized health insights.

## 🛠️ Tech Stack

* **Hardware**: ESP32-WROVER-B, PMS5003, Grove Multichannel Gas Sensor V2
* **Cloud**: Supabase (PostgreSQL + REST API)
* **Machine Learning**: Python, Scikit-learn (XGBoost), NumPy, Pandas
* **Frontend**: React Native (for the mobile app)
* **Backend API (Optional)**: Django REST Framework (for serving model predictions)
* **Visualization**: Real-time dashboards (via ThingsBoard or custom)

## 🔍 ML Model Summary

* **Input**: Lag features of PM2.5, PM10, NO2
* **Output**: Next-step predictions for each pollutant
* **Method**: Recursive forecasting using trained XGBoost model
* **Deployment**: Supports real-time edge + cloud hybrid inference

## 📲 Usage Instructions

1. **Set up hardware** and flash ESP32 with firmware to collect data.
2. **Connect ESP32 to Supabase** using HTTPS POST every 15 seconds.
3. **Run prediction service** (Python/Django) that pulls data and forecasts AQI.
4. **Deploy frontend** on mobile device to view alerts and live AQI maps.

## ⚠️ Alert System

Pollution thresholds mapped to asthma severity levels:

* **Minimal Risk**: PM2.5 < 35 µg/m³
* **Severe Persistent**: PM2.5 > 150 µg/m³ (alerts via app or SMS)
* Alerts are calculated based on the worst pollutant of the moment using a max() severity strategy.

## 📈 Results Summary

* Sensors tested under smoke and urban environments (Mumbai: Bhayandar, Mira Road, Vasai, Aarey).
* Data transmission success: 99.5% uptime over 24 hours.
* AQI prediction and asthma severity classification confirmed with real-world variability.

## 🎥 Demo Video

Watch the project ppt: [YouTube Demo](https://youtu.be/FUIPMjhpUqQ?feature=shared)

## 👥 Team

* **Suyash Santosh Konduskar** 
* **Saumya Desai**
* **Vivek Nair**
* **Guide**: Dr. Kriti Srivastava

## 📄 Report

For detailed architecture, evaluations, and research references, read the full [Project Report](./docs/AI%20Driven%20Air%20Quality%20Prediction%20and%20Alerts.pdf).

## 📜 License

This project is licensed under the MIT License. See `LICENSE` for details.

---

Let me know if you’d like to embed the video directly or add a thumbnail.
