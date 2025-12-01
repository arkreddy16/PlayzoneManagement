# Deploying to PythonAnywhere

Since your application uses local CSV files to store data, **PythonAnywhere** is the best free hosting option. Unlike other providers, it keeps your files safe even after restarts.

## Prerequisites
- A GitHub account (if you haven't pushed your code to GitHub yet).
- Your code pushed to a GitHub repository.

## Step 1: Create a PythonAnywhere Account
1. Go to [www.pythonanywhere.com](https://www.pythonanywhere.com/).
2. Click **Pricing & Signup**.
3. Click **Create a Beginner account** (Free).
4. Fill in your details and register.

## Step 2: Upload Your Code
1. Log in to your PythonAnywhere dashboard.
2. Click on **Consoles** > **Bash**.
3. In the terminal that opens, clone your repository (replace `YOUR_USERNAME` and `REPO_NAME`):
   ```bash
   git clone https://github.com/YOUR_USERNAME/REPO_NAME.git mysite
   ```
   *Note: We renamed the folder to `mysite` to make it easier.*

## Step 3: Create a Virtual Environment
In the same Bash console, run these commands:

1. Go into your project folder:
   ```bash
   cd mysite
   ```
2. Create a virtual environment:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   ```
   *(If it asks for a password or fails, try `python3 -m venv venv` and then `source venv/bin/activate`)*
   
   **Better method for PythonAnywhere:**
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   pip install -r requirements.txt
   ```

## Step 4: Configure the Web App
1. Go back to the **Dashboard** (click the logo).
2. Click on the **Web** tab.
3. Click **Add a new web app**.
4. Click **Next** -> Select **Flask** -> Select **Python 3.10** (or matching your local version).
5. **Path**: It will ask for the path. Just accept the default for now (we will change it).
6. Once created, scroll down to the **Code** section.
   - **Source code:** Enter `/home/yourusername/mysite` (replace `yourusername` with your actual PythonAnywhere username).
   - **Working directory:** Enter `/home/yourusername/mysite`.
7. Scroll to the **Virtualenv** section.
   - Enter the path: `/home/yourusername/.virtualenvs/myenv`

## Step 5: Configure the WSGI File
1. In the **Web** tab, look for the **WSGI configuration file** link (it looks like `/var/www/yourusername_pythonanywhere_com_wsgi.py`). Click it.
2. Delete everything in that file and replace it with this:

   ```python
   import sys
   import os

   # Add your project directory to the sys.path
   project_home = '/home/YOUR_USERNAME/mysite'
   if project_home not in sys.path:
       sys.path = [project_home] + sys.path

   # Set environment variables if needed
   os.environ['JWT_SECRET_KEY'] = 'your-secret-key-here'

   # Import flask app but need to call it "application" for WSGI to work
   from app import app as application
   ```
   *Replace `YOUR_USERNAME` with your actual username.*

3. Click **Save**.

## Step 6: Finalize and Reload
1. Go back to the **Web** tab.
2. Click the big green **Reload** button at the top.
3. Click the link to your site (e.g., `yourusername.pythonanywhere.com`) to verify it works!

## Troubleshooting
- **Error Log**: If something goes wrong, check the **Error log** link in the Web tab.
- **Database**: Your CSV files will be created in the `data/` folder inside `mysite`. They will persist there.
