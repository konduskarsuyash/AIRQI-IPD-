from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Optional
from datetime import datetime
from ....db.database import get_db_connection
from ....schemas.schemas import AsthmaFormData, AsthmaFormStatus, UserWithAsthma

from ...deps import get_current_active_user
import json
import os
import uuid

router = APIRouter()

@router.get("/asthma-form-status", response_model=AsthmaFormStatus)
async def get_asthma_form_status(current_user: UserWithAsthma = Depends(get_current_active_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if user has submitted asthma form data
        cur.execute(
            "SELECT created_at FROM asthma_data WHERE user_id = %s",
            (current_user.id,)
        )
        result = cur.fetchone()
        
        if result:
            return AsthmaFormStatus(
                has_submitted=True,
                last_updated=result['created_at']
            )
        else:
            return AsthmaFormStatus(
                has_submitted=False,
                last_updated=None
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()

@router.post("/asthma-form", response_model=AsthmaFormData)
async def submit_asthma_form(
    severity: str = Form(...),
    symptoms: str = Form(...),
    trigger_factors: str = Form(...),
    allergies: Optional[str] = Form(None),
    checkup_frequency: str = Form(...),
    last_attack_date: Optional[str] = Form(None),
    report_pdf: Optional[UploadFile] = File(None),
    current_user: UserWithAsthma = Depends(get_current_active_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Parse JSON strings to lists
        symptoms_list = json.loads(symptoms)
        trigger_factors_list = json.loads(trigger_factors)
        allergies_list = json.loads(allergies) if allergies else None
        
        # Parse date if provided
        last_attack_date_obj = None
        if last_attack_date:
            try:
                last_attack_date_obj = datetime.fromisoformat(last_attack_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format for last_attack_date"
                )
        
        # Handle PDF file upload
        report_pdf_url = None
        if report_pdf:
            # Create user-specific directory if it doesn't exist
            user_dir = os.path.join("static", "asthma-reports", str(current_user.id))
            os.makedirs(user_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(report_pdf.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(user_dir, unique_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                content = await report_pdf.read()
                buffer.write(content)
            
            # Generate URL for the file
            report_pdf_url = f"/static/asthma-reports/{current_user.id}/{unique_filename}"
        
        # Check if asthma data already exists for this user
        cur.execute("SELECT * FROM asthma_data WHERE user_id = %s", (current_user.id,))
        existing_data = cur.fetchone()
        
        if existing_data:
            # Update existing asthma data
            cur.execute(
                """
                UPDATE asthma_data 
                SET severity = %s, symptoms = %s, trigger_factors = %s, 
                    allergies = %s, checkup_frequency = %s, last_attack_date = %s,
                    report_pdf_url = %s
                WHERE user_id = %s
                RETURNING *
                """,
                (
                    severity,
                    symptoms_list,
                    trigger_factors_list,
                    allergies_list,
                    checkup_frequency,
                    last_attack_date_obj,
                    report_pdf_url,
                    current_user.id
                )
            )
        else:
            # Insert new asthma data
            cur.execute(
                """
                INSERT INTO asthma_data (
                    user_id, severity, symptoms, trigger_factors, 
                    allergies, checkup_frequency, last_attack_date, report_pdf_url
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    current_user.id,
                    severity,
                    symptoms_list,
                    trigger_factors_list,
                    allergies_list,
                    checkup_frequency,
                    last_attack_date_obj,
                    report_pdf_url
                )
            )
        
        updated_data = cur.fetchone()
        conn.commit()
        
        return AsthmaFormData(
            severity=updated_data['severity'],
            symptoms=updated_data['symptoms'],
            trigger_factors=updated_data['trigger_factors'],
            allergies=updated_data['allergies'],
            checkup_frequency=updated_data['checkup_frequency'],
            last_attack_date=updated_data['last_attack_date'],
            report_pdf_url=updated_data['report_pdf_url']
        )
    
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format for symptoms, trigger_factors, or allergies"
        )
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close() 