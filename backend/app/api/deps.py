from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..db.database import get_db_connection
from ..schemas.schemas import UserWithAsthma, AsthmaFormData
from ..core.security import verify_token
import psycopg2

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    email = verify_token(token)
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                u.id as user_id, u.username, u.email, u.disabled,
                a.severity, a.symptoms, a.trigger_factors,
                a.allergies, a.checkup_frequency, a.last_attack_date, a.report_pdf_url
            FROM users u 
            LEFT JOIN asthma_data a ON u.id = a.user_id 
            WHERE u.email = %s
        """, (email,))

        user = cur.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_dict = dict(user)

        user_base = {
            "id": user_dict.get("user_id"),
            "username": user_dict.get("username"),
            "email": user_dict.get("email"),
            "disabled": user_dict.get("disabled"),
        }

        asthma_data = None
        if user_dict.get("symptoms") is not None:
            asthma_data = AsthmaFormData(
                severity=user_dict.get("severity"),
                symptoms=user_dict.get("symptoms"),
                trigger_factors=user_dict.get("trigger_factors"),
                allergies=user_dict.get("allergies"),
                checkup_frequency=user_dict.get("checkup_frequency"),
                last_attack_date=user_dict.get("last_attack_date"),
                report_pdf_url=user_dict.get("report_pdf_url"),
            )

        return UserWithAsthma(**user_base, asthma_data=asthma_data)
    except Exception as e:
        print(f"Error in get_current_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    finally:
        cur.close()
        conn.close()

async def get_current_active_user(current_user: UserWithAsthma = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 