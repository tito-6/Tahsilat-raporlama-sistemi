from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
import json
import os

# Import LangChain components
from langchain.chat_models import ChatOpenAI
from langchain.chains import LLMChain
from langchain.agents import initialize_agent, Tool, AgentType
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema import SystemMessage, HumanMessage, AIMessage

from api.models.database import get_db
from api.utils.report_generator import (
    generate_daily_report, generate_weekly_report, generate_monthly_channel_report,
    generate_yearly_summary, generate_property_report, generate_customer_report
)
from api.utils.data_storage import get_payments, get_daily_totals, get_channel_summary

# Get OpenAI API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY environment variable not set!")

# Create the agent router
router = APIRouter()

# Initialize the language model
llm = ChatOpenAI(
    model_name="gpt-4-0613",
    temperature=0.2,
    openai_api_key=OPENAI_API_KEY
)

# System prompt template for the assistant
SYSTEM_TEMPLATE = """You are an AI assistant for the Tahsilat Payment Reporting System, which manages payment data for real estate companies.
You help users analyze payment data, generate reports, and answer questions about the payments.

Available payment data includes:
- Customer names
- Property IDs and names
- Payment amounts in both TL (Turkish Lira) and USD (US Dollars)
- Payment dates
- Payment channels (e.g. Bank Transfer, Cash, Credit Card)

You have access to the following tools:
1. daily_report - Generate a daily USD payment report for a date range
2. weekly_report - Generate a weekly summary report for a date range
3. monthly_channel_report - Generate a monthly payment channel report for a specific month
4. yearly_report - Generate a yearly summary report
5. property_report - Generate a report for a specific property
6. customer_report - Generate a report for a specific customer
7. search_payments - Search for specific payment records

When users ask for data analysis or reports, always use the appropriate tool rather than making up information.

Always respond in a helpful, concise manner and focus on providing data-driven insights.
"""


# Define tool functions
def daily_report_tool(start_date_str: str, end_date_str: str, db: Session) -> Dict[str, Any]:
    """Generate a daily USD payment report for a date range."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        report = generate_daily_report(db, start_date, end_date)
        return report
    except Exception as e:
        return {"error": f"Error generating daily report: {str(e)}"}


def weekly_report_tool(start_date_str: str, end_date_str: str, db: Session) -> Dict[str, Any]:
    """Generate a weekly summary report for a date range."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        report = generate_weekly_report(db, start_date, end_date)
        return report
    except Exception as e:
        return {"error": f"Error generating weekly report: {str(e)}"}


def monthly_channel_report_tool(year: int, month: int, db: Session) -> Dict[str, Any]:
    """Generate a monthly payment channel report."""
    try:
        report = generate_monthly_channel_report(db, year, month)
        return report
    except Exception as e:
        return {"error": f"Error generating monthly channel report: {str(e)}"}


def yearly_report_tool(year: int, db: Session) -> Dict[str, Any]:
    """Generate a yearly summary report."""
    try:
        report = generate_yearly_summary(db, year)
        return report
    except Exception as e:
        return {"error": f"Error generating yearly report: {str(e)}"}


def property_report_tool(property_id: str, start_date_str: Optional[str] = None, end_date_str: Optional[str] = None, db: Session = None) -> Dict[str, Any]:
    """Generate a report for a specific property."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        report = generate_property_report(db, property_id, start_date, end_date)
        return report
    except Exception as e:
        return {"error": f"Error generating property report: {str(e)}"}


def customer_report_tool(customer_name: str, start_date_str: Optional[str] = None, end_date_str: Optional[str] = None, db: Session = None) -> Dict[str, Any]:
    """Generate a report for a specific customer."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        report = generate_customer_report(db, customer_name, start_date, end_date)
        return report
    except Exception as e:
        return {"error": f"Error generating customer report: {str(e)}"}


def search_payments_tool(
    skip: int = 0, 
    limit: int = 20, 
    start_date_str: Optional[str] = None, 
    end_date_str: Optional[str] = None, 
    customer_name: Optional[str] = None, 
    property_id: Optional[str] = None,
    payment_channel: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """Search for specific payment records."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        payments = get_payments(
            db, skip, limit, start_date, end_date, 
            customer_name, property_id, payment_channel
        )
        
        return {
            "count": len(payments),
            "data": [payment.to_dict() for payment in payments]
        }
    except Exception as e:
        return {"error": f"Error searching payments: {str(e)}"}


# Create agent with tools
def create_agent(db: Session):
    """Create a LangChain agent with the payment reporting tools."""
    tools = [
        Tool(
            name="daily_report",
            func=lambda args: daily_report_tool(args["start_date"], args["end_date"], db),
            description="Generate a daily USD payment report for a date range. Input should be a JSON string with start_date and end_date in YYYY-MM-DD format."
        ),
        Tool(
            name="weekly_report",
            func=lambda args: weekly_report_tool(args["start_date"], args["end_date"], db),
            description="Generate a weekly summary report for a date range. Input should be a JSON string with start_date and end_date in YYYY-MM-DD format."
        ),
        Tool(
            name="monthly_channel_report",
            func=lambda args: monthly_channel_report_tool(args["year"], args["month"], db),
            description="Generate a monthly payment channel report. Input should be a JSON string with year as integer and month as integer (1-12)."
        ),
        Tool(
            name="yearly_report",
            func=lambda args: yearly_report_tool(args["year"], db),
            description="Generate a yearly summary report. Input should be a JSON string with year as integer."
        ),
        Tool(
            name="property_report",
            func=lambda args: property_report_tool(
                args["property_id"], 
                args.get("start_date"), 
                args.get("end_date"), 
                db
            ),
            description="Generate a report for a specific property. Input should be a JSON string with property_id and optional start_date and end_date in YYYY-MM-DD format."
        ),
        Tool(
            name="customer_report",
            func=lambda args: customer_report_tool(
                args["customer_name"], 
                args.get("start_date"), 
                args.get("end_date"), 
                db
            ),
            description="Generate a report for a specific customer. Input should be a JSON string with customer_name and optional start_date and end_date in YYYY-MM-DD format."
        ),
        Tool(
            name="search_payments",
            func=lambda args: search_payments_tool(
                args.get("skip", 0), 
                args.get("limit", 20), 
                args.get("start_date"), 
                args.get("end_date"),
                args.get("customer_name"),
                args.get("property_id"),
                args.get("payment_channel"),
                db
            ),
            description="Search for specific payment records. Input should be a JSON string with optional parameters: skip, limit, start_date, end_date, customer_name, property_id, payment_channel."
        ),
    ]
    
    # Create a memory buffer for the conversation
    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
    
    # Create the agent
    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
        verbose=True,
        memory=memory,
    )
    
    return agent


@router.post("/assistant")
async def chat_with_assistant(
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI assistant to analyze payment data and generate reports.
    """
    try:
        message = request_data.get("message", "")
        history = request_data.get("history", [])
        
        # Create the agent
        agent = create_agent(db)
        
        # Set the system message
        agent.memory.chat_memory.messages.append(SystemMessage(content=SYSTEM_TEMPLATE))
        
        # Add message history
        for msg in history:
            if msg["role"] == "user":
                agent.memory.chat_memory.messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                agent.memory.chat_memory.messages.append(AIMessage(content=msg["content"]))
        
        # Process the user message
        response = agent.run(message)
        
        # Check if a tool was used and extract any data
        tool_used = None
        tool_data = None
        
        # For simplicity, we'll assume the last AIMessage contains the tool usage information
        for msg in reversed(agent.memory.chat_memory.messages):
            if isinstance(msg, AIMessage) and msg.content != response:
                if "I'll use the " in msg.content and " tool" in msg.content:
                    # Extract tool name from message
                    tool_start = msg.content.find("I'll use the ") + len("I'll use the ")
                    tool_end = msg.content.find(" tool", tool_start)
                    if tool_end > tool_start:
                        tool_used = msg.content[tool_start:tool_end]
                        
                        # Try to extract any report data in the response
                        if "report" in tool_used:
                            try:
                                # Look for JSON-like data in the response
                                if "summary" in response and "total_usd" in response:
                                    # This is a simple heuristic that will need enhancement
                                    tool_data = {
                                        "report_name": f"{tool_used.replace('_', ' ').title()}",
                                        "summary": {
                                            "total_usd": float(response.split("total_usd: ")[1].split("}")[0].strip()),
                                            "total_count": int(response.split("total_count: ")[1].split("}")[0].strip())
                                        }
                                    }
                            except:
                                pass
                break
        
        return {
            "content": response,
            "tool": tool_used,
            "data": tool_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")