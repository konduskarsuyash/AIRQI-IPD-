from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from pydantic import BaseModel
from ....core.recommendation import DatabaseManager
from agno.embedder.google import GeminiEmbedder
from agno.models.google import Gemini
from agno.agent import Agent, RunResponse
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.knowledge.pdf import PDFKnowledgeBase, PDFReader
import os
from dotenv import load_dotenv

load_dotenv()
os.environ['GOOGLE_API_KEY'] = os.getenv('GOOGLE_API_KEY')

router = APIRouter()

# Initialize the DatabaseManager
db_manager = DatabaseManager()
embeddings = GeminiEmbedder()


class RecommendationRequest(BaseModel):
    user_id: int

@router.post("/get_recommendations")
async def get_recommendations(user_id: str = Form(...), file: UploadFile = File(...)):
    """
    Fetch the latest user record and generate recommendations.

    Args:
        user_id (int): The ID of the user (sent as form-data).
        file (UploadFile): A PDF file uploaded by the user.

    Returns:
        dict: The recommendations based on the user's latest record.
    """
    try:
        # Fetch the latest user record
        user_record = db_manager.fetch_latest_user_record(user_id)
        print("user_record", user_record)

        if not user_record:
            raise HTTPException(status_code=404, detail="No record found for the given user_id")

        # Extract sensor data
        sensor_data = user_record.get("sensor_data", {})
        pm1_0 = sensor_data.get("pm1_0")
        pm2_5 = sensor_data.get("pm2_5")
        pm10 = sensor_data.get("pm10")
        no2 = sensor_data.get("no2")

        # Call the get_recommendation function
        recommendations = get_recommendation(
            user_record=user_record,
            file=file,
            pm1_0=pm1_0,
            pm2_5=pm2_5,
            pm10=pm10,
            no2=no2
        )

        return {"user_id": user_id, "recommendations": recommendations}
    except Exception as e:
        print("Error",e)
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

def get_recommendation(user_record, file: UploadFile, pm1_0, pm2_5, pm10, no2):
    """
    Extract each column from the user record and implement recommendation logic.

    Args:
        user_record (dict): The latest user record.
        file (UploadFile): A PDF file uploaded by the user.
        pm1_0, pm2_5, pm10, no2: Pollutant levels from sensor data.

    Returns:
        dict: Recommendations based on the user record and the uploaded file.
    """
    # Extracting each column from the user_record
    severity = user_record.get("severity")
    symptoms = user_record.get("symptoms")
    trigger_factors = user_record.get("trigger_factors")
    report_pdf_url = user_record.get("report_pdf_url")
    allergies = user_record.get("allergies")
    checkup_date = user_record.get("checkup_date")
    last_attack_date = user_record.get("last_attack_date")

    # Call the AI agent
    response = ai_agent(
        file=file,
        severity=severity,
        symptoms=symptoms,
        trigger_factors=trigger_factors,
        report_pdf_url=report_pdf_url,
        allergies=allergies,
        checkup_date=checkup_date,
        last_attack_date=last_attack_date,
        pm1_0=pm1_0,
        pm2_5=pm2_5,
        pm10=pm10,
        no2=no2
    )

    return response

def ai_agent(file: UploadFile, severity, symptoms, trigger_factors, report_pdf_url, allergies, checkup_date, last_attack_date, pm1_0, pm2_5, pm10, no2):
    # Define the directory to save the uploaded file
    upload_dir = "uploaded_files"
    os.makedirs(upload_dir, exist_ok=True)  # Create the directory if it doesn't exist

    # Save the uploaded file in the specified directory
    pdf_path = os.path.join(upload_dir, file.filename)
    with open(pdf_path, "wb") as f:
        f.write(file.file.read())

    # Initialize the AGNO Agent
    agent = Agent(
        model=Gemini(id="gemini-1.5-flash"),
        instructions="""You are an expert recommender for asthma patients. You are given a PDF file of an asthma patient's 
        report and live air pollutant data. Based on the patient's report and pollutant readings, provide personalized recommendations.""",
        knowledge=PDFKnowledgeBase(
            path=pdf_path,
            vector_db=LanceDb(
                uri="tmp/lancedb",
                table_name="documents",
                search_type=SearchType.hybrid,
                embedder=embeddings,
            ),
            reader=PDFReader(chunk=True),
        ),
        show_tool_calls=True,
        markdown=True,
        add_references=True,
    )

    # Load the knowledge base if available
    if agent.knowledge is not None:
        agent.knowledge.load()

    # Define the query for the agent
    query = f"""This is some basic information about the patient:
    Severity: {severity}
    Symptoms: {symptoms}
    Trigger Factors: {trigger_factors}
    Allergies: {allergies}
    Checkup Date: {checkup_date}
    Last Attack Date: {last_attack_date}
    These are the live pollutant levels:
    PM1.0: {pm1_0}, PM2.5: {pm2_5}, PM10: {pm10}, NO2: {no2}.
    Based on this information and the PDF file (if uploaded), please provide personalized recommendations for the patient.
    The recommendations should be short and crisp.
    Give RECOMMENDATIONS IN 2 LINES IT should include based on the current pollutant levels these and as you have these problems you should do this."""

    # Run the agent with the query
    response: RunResponse = agent.run(query, stream=False)

    # Return the agent's response
    return response.content 