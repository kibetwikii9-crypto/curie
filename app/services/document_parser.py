"""Document parser service for extracting text from various file formats.

Supports:
- Word documents (.docx)
- PDF files (.pdf)
- Text files (.txt)
- Markdown files (.md)
- Excel/CSV files (.xlsx, .csv)
"""
import logging
import io
import csv
from typing import Optional, Dict, List
from pathlib import Path

log = logging.getLogger(__name__)


def parse_document(file_content: bytes, filename: str) -> Optional[str]:
    """
    Parse document and extract text content.
    
    Args:
        file_content: Raw bytes of the uploaded file
        filename: Original filename with extension
    
    Returns:
        Extracted text content or None if parsing fails
    """
    try:
        # Get file extension
        extension = Path(filename).suffix.lower()
        
        log.info(f"Parsing document: {filename} (extension: {extension})")
        
        # Route to appropriate parser based on extension
        if extension == '.docx':
            return parse_docx(file_content)
        elif extension == '.pdf':
            return parse_pdf(file_content)
        elif extension in ['.txt', '.text']:
            return parse_text(file_content)
        elif extension in ['.md', '.markdown']:
            return parse_markdown(file_content)
        elif extension in ['.csv', '.xlsx', '.xls']:
            return parse_spreadsheet(file_content, extension)
        else:
            log.warning(f"Unsupported file format: {extension}")
            return None
    
    except Exception as e:
        log.error(f"Error parsing document {filename}: {e}", exc_info=True)
        return None


def parse_docx(file_content: bytes) -> Optional[str]:
    """Parse Word document (.docx) and extract text."""
    try:
        from docx import Document
        
        # Load document from bytes
        doc = Document(io.BytesIO(file_content))
        
        # Extract text from all paragraphs
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text.strip())
        
        # Extract text from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    if cell.text.strip():
                        row_text.append(cell.text.strip())
                if row_text:
                    text_parts.append(" | ".join(row_text))
        
        result = "\n\n".join(text_parts)
        log.info(f"✅ Extracted {len(result)} characters from DOCX")
        return result if result.strip() else None
    
    except ImportError:
        log.error("python-docx not installed. Run: pip install python-docx")
        return None
    except Exception as e:
        log.error(f"Error parsing DOCX: {e}")
        return None


def parse_pdf(file_content: bytes) -> Optional[str]:
    """Parse PDF and extract text."""
    try:
        import pdfplumber
        
        # Try pdfplumber first (better quality)
        try:
            text_parts = []
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text and text.strip():
                        text_parts.append(text.strip())
                    
                    # Also extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row and any(cell for cell in row if cell):
                                row_text = " | ".join(str(cell) for cell in row if cell)
                                text_parts.append(row_text)
            
            result = "\n\n".join(text_parts)
            log.info(f"✅ Extracted {len(result)} characters from PDF (pdfplumber)")
            return result if result.strip() else None
        
        except Exception as pdf_error:
            log.warning(f"pdfplumber failed, trying PyPDF2: {pdf_error}")
    
    except ImportError:
        log.warning("pdfplumber not installed, trying PyPDF2")
    
    # Fallback to PyPDF2
    try:
        from PyPDF2 import PdfReader
        
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text_parts = []
        
        for page_num, page in enumerate(pdf_reader.pages, 1):
            text = page.extract_text()
            if text and text.strip():
                text_parts.append(text.strip())
        
        result = "\n\n".join(text_parts)
        log.info(f"✅ Extracted {len(result)} characters from PDF (PyPDF2)")
        return result if result.strip() else None
    
    except ImportError:
        log.error("PyPDF2 not installed. Run: pip install PyPDF2")
        return None
    except Exception as e:
        log.error(f"Error parsing PDF: {e}")
        return None


def parse_text(file_content: bytes) -> Optional[str]:
    """Parse plain text file."""
    try:
        # Try UTF-8 first
        try:
            text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to latin-1
            text = file_content.decode('latin-1')
        
        log.info(f"✅ Extracted {len(text)} characters from TXT")
        return text.strip() if text.strip() else None
    
    except Exception as e:
        log.error(f"Error parsing text file: {e}")
        return None


def parse_markdown(file_content: bytes) -> Optional[str]:
    """Parse Markdown file and extract text."""
    try:
        # Try UTF-8 first
        try:
            text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            text = file_content.decode('latin-1')
        
        # Remove markdown syntax for cleaner extraction
        try:
            import markdown
            from html import unescape
            import re
            
            # Convert markdown to HTML then strip tags
            html = markdown.markdown(text)
            # Remove HTML tags
            text_only = re.sub(r'<[^>]+>', '', html)
            # Unescape HTML entities
            text_only = unescape(text_only)
            
            log.info(f"✅ Extracted {len(text_only)} characters from Markdown")
            return text_only.strip() if text_only.strip() else None
        
        except ImportError:
            # Fallback: just remove basic markdown syntax
            text = text.replace('#', '').replace('*', '').replace('_', '')
            log.info(f"✅ Extracted {len(text)} characters from Markdown (basic)")
            return text.strip() if text.strip() else None
    
    except Exception as e:
        log.error(f"Error parsing markdown: {e}")
        return None


def parse_spreadsheet(file_content: bytes, extension: str) -> Optional[str]:
    """Parse Excel/CSV and extract text."""
    try:
        if extension == '.csv':
            # Parse CSV
            try:
                text = file_content.decode('utf-8')
            except UnicodeDecodeError:
                text = file_content.decode('latin-1')
            
            reader = csv.reader(io.StringIO(text))
            rows = []
            for row in reader:
                if row and any(cell.strip() for cell in row if cell):
                    rows.append(" | ".join(cell.strip() for cell in row if cell))
            
            result = "\n".join(rows)
            log.info(f"✅ Extracted {len(result)} characters from CSV")
            return result if result.strip() else None
        
        else:
            # Parse Excel (.xlsx, .xls)
            try:
                from openpyxl import load_workbook
                
                workbook = load_workbook(io.BytesIO(file_content), read_only=True)
                text_parts = []
                
                for sheet_name in workbook.sheetnames:
                    sheet = workbook[sheet_name]
                    text_parts.append(f"Sheet: {sheet_name}")
                    
                    for row in sheet.iter_rows(values_only=True):
                        if row and any(cell for cell in row if cell):
                            row_text = " | ".join(str(cell) for cell in row if cell)
                            text_parts.append(row_text)
                    
                    text_parts.append("")  # Blank line between sheets
                
                result = "\n".join(text_parts)
                log.info(f"✅ Extracted {len(result)} characters from Excel")
                return result if result.strip() else None
            
            except ImportError:
                log.error("openpyxl not installed. Run: pip install openpyxl")
                return None
    
    except Exception as e:
        log.error(f"Error parsing spreadsheet: {e}")
        return None


def extract_qa_with_gpt(document_text: str, openai_api_key: str) -> List[Dict[str, any]]:
    """
    Use GPT-4o to intelligently extract Q&A pairs from document text.
    
    Args:
        document_text: Raw text extracted from document
        openai_api_key: OpenAI API key
    
    Returns:
        List of dictionaries with question, answer, and keywords
    """
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=openai_api_key)
        
        # Truncate if too long (GPT-4o has 128k context, but we'll be conservative)
        max_chars = 50000  # ~12,500 tokens
        if len(document_text) > max_chars:
            log.warning(f"Document too long ({len(document_text)} chars), truncating to {max_chars}")
            document_text = document_text[:max_chars] + "\n\n[Document truncated...]"
        
        system_prompt = """You are an expert at analyzing documents and extracting knowledge into Q&A format.

Your task:
1. Read the document carefully
2. Identify key information that customers might ask about
3. Create clear, specific Q&A pairs
4. Extract relevant keywords for each Q&A

Guidelines:
- Create 5-15 Q&A pairs (depending on document length)
- Questions should be natural (how customers would ask)
- Answers should be concise but complete (2-4 sentences)
- Include important details, numbers, dates, policies
- Keywords should help match customer queries

Return ONLY valid JSON in this exact format (no markdown, no extra text):
[
  {
    "question": "What are your business hours?",
    "answer": "We are open Monday to Friday from 9 AM to 6 PM EST, and Saturday from 10 AM to 4 PM EST. We are closed on Sundays and major holidays.",
    "keywords": ["hours", "open", "time", "schedule", "when", "available"]
  }
]"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract Q&A pairs from this document:\n\n{document_text}"}
            ],
            temperature=0.3,  # Lower temperature for consistent extraction
            max_tokens=4000,
            timeout=60.0
        )
        
        result_text = response.choices[0].message.content
        
        # Parse JSON response
        import json
        try:
            qa_pairs = json.loads(result_text)
            log.info(f"✅ GPT extracted {len(qa_pairs)} Q&A pairs")
            return qa_pairs
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block if GPT wrapped it
            import re
            json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', result_text, re.DOTALL)
            if json_match:
                qa_pairs = json.loads(json_match.group(1))
                log.info(f"✅ GPT extracted {len(qa_pairs)} Q&A pairs (from code block)")
                return qa_pairs
            else:
                log.error("Failed to parse GPT response as JSON")
                return []
    
    except Exception as e:
        log.error(f"Error extracting Q&A with GPT: {e}", exc_info=True)
        return []
