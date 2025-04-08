import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

class DatabaseManager:
    def __init__(self):
        # Load environment variables from .env file
        load_dotenv()

        # Retrieve database credentials from environment variables
        self.DB_HOST = os.getenv("DB_HOST")
        self.DB_NAME = os.getenv("DB_NAME")
        self.DB_USER = os.getenv("DB_USER")
        self.DB_PASSWORD = os.getenv("DB_PASSWORD")

        if not all([self.DB_HOST, self.DB_NAME, self.DB_USER, self.DB_PASSWORD]):
            raise ValueError("Database credentials are not set in the .env file")

    def connect_to_database(self):
        """
        Create a connection to the PostgreSQL database.

        Returns:
            connection: A psycopg2 connection object.
        """
        try:
            connection = psycopg2.connect(
                host=self.DB_HOST,
                database=self.DB_NAME,
                user=self.DB_USER,
                password=self.DB_PASSWORD
            )
            print("Connected to the database!")
            return connection
        except psycopg2.Error as e:
            print(f"Error connecting to the database: {e}")
            raise

    def fetch_latest_user_record(self, user_id):
        """
        Fetch the latest record for a user based on the created_at column and the latest sensor data.

        Args:
            user_id (int): The ID of the user.

        Returns:
            dict: A dictionary containing the latest user record fields and sensor data, or None if no record is found.
        """
        user_query = """
            SELECT severity, symptoms, trigger_factors, report_pdf_url, allergies, checkup_frequency, last_attack_date
            FROM asthma_data
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1;
        """

        sensor_query = """
            SELECT pm1_0, pm2_5, pm10, no2
            FROM sensor_data
            ORDER BY timestamp DESC
            LIMIT 1;
        """

        try:
            # Connect to the database
            connection = self.connect_to_database()
            cursor = connection.cursor()

            # Fetch the latest user record
            cursor.execute(user_query, (user_id,))
            user_result = cursor.fetchone()

            # Fetch the latest sensor data
            cursor.execute(sensor_query)
            sensor_result = cursor.fetchone()

            # Close the cursor and connection
            cursor.close()
            connection.close()

            # Map the user result to a dictionary if a record is found
            if user_result:
                user_data = {
                    "severity": user_result[0],
                    "symptoms": user_result[1],
                    "trigger_factors": user_result[2],
                    "report_pdf_url": user_result[3],
                    "allergies": user_result[4],
                    "checkup_date": user_result[5],
                    "last_attack_date": user_result[6],
                }
            else:
                user_data = None

            # Map the sensor result to a dictionary if data is found
            if sensor_result:
                sensor_data = {
                    "pm1_0": sensor_result[0],
                    "pm2_5": sensor_result[1],
                    "pm10": sensor_result[2],
                    "no2": sensor_result[3],
                }
            else:
                sensor_data = None

            # Combine user data and sensor data
            if user_data:
                user_data["sensor_data"] = sensor_data

            return user_data
        except psycopg2.Error as e:
            print(f"Error fetching user or sensor data: {e}")
            raise
