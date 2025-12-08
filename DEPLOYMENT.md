# How to Deploy Your AQI App Online

This guide will help you host your AQI app so you can share it with others. Here are the **easiest options**:

## 🚀 Option 1: Render (Recommended - Easiest!)

**Render** is the simplest option with a free tier. Here's how:

### Steps:

1. **Create a Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub (easiest) or email

2. **Push Your Code to GitHub**
   - If you don't have a GitHub account, create one at [github.com](https://github.com)
   - Create a new repository
   - Upload your code (or use GitHub Desktop/Git commands)

3. **Deploy on Render**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect it's a Node.js app
   - **Settings:**
     - **Name**: `aqi-app` (or any name you like)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - **Add Environment Variable:**
     - Click "Environment" tab
     - Add: `OPENWEATHER_API_KEY` = `your_actual_api_key_here`
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment

4. **Share the URL**
   - Render gives you a URL like: `https://aqi-app.onrender.com`
   - Share this with your girlfriend! 🎉

**Free Tier**: 750 hours/month (enough for always-on if you're the only user)

---

## 🚂 Option 2: Railway (Also Very Easy!)

**Railway** is another great option with a simple setup:

### Steps:

1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-detects Node.js

3. **Add Environment Variable**
   - Go to your project → "Variables" tab
   - Add: `OPENWEATHER_API_KEY` = `your_actual_api_key_here`

4. **Get Your URL**
   - Railway gives you a URL automatically
   - Share it!

**Free Tier**: $5 credit/month (plenty for a small app)

---

## ✈️ Option 3: Fly.io (Free Tier Available)

**Fly.io** is great for small apps:

### Steps:

1. **Install Fly CLI**
   ```powershell
   # In PowerShell (run as Administrator)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Sign Up**
   - Go to [fly.io](https://fly.io) and sign up
   - Run: `fly auth login`

3. **Create Fly App**
   - In your project folder, run: `fly launch`
   - Follow the prompts
   - When asked about port, enter: `3000`

4. **Add Environment Variable**
   ```powershell
   fly secrets set OPENWEATHER_API_KEY=your_actual_api_key_here
   ```

5. **Deploy**
   ```powershell
   fly deploy
   ```

6. **Get URL**
   - Your app will be at: `https://your-app-name.fly.dev`

**Free Tier**: 3 shared VMs (enough for small apps)

---

## 📝 Quick Setup Checklist

Before deploying, make sure:

- ✅ Your code is on GitHub (for Render/Railway)
- ✅ You have an OpenWeatherMap API key
- ✅ Your `server.js` uses `process.env.PORT` (already updated!)
- ✅ Your `.gitignore` excludes `node_modules` and `.env` (already done!)

---

## 🔑 Getting Your OpenWeatherMap API Key

If you don't have one yet:

1. Go to [openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for a free account
3. Go to "API Keys" section
4. Copy your API key
5. Add it as an environment variable in your hosting platform

**Free Tier**: 1,000 API calls/day (plenty for personal use!)

---

## 🎯 Which Should You Choose?

- **Render**: Best for beginners, easiest setup
- **Railway**: Great UI, very simple
- **Fly.io**: More control, good for learning

**My Recommendation**: Start with **Render** - it's the easiest!

---

## 🐛 Troubleshooting

**App won't start?**
- Check that `OPENWEATHER_API_KEY` is set in environment variables
- Check the logs in your hosting platform's dashboard

**Database issues?**
- SQLite should work fine on all platforms
- The database file will be created automatically

**Need help?**
- Check your hosting platform's documentation
- Look at the deployment logs in the dashboard

---

## 🎉 After Deployment

Once deployed, you'll get a URL like:
- `https://your-app.onrender.com` (Render)
- `https://your-app.railway.app` (Railway)
- `https://your-app.fly.dev` (Fly.io)

Share this URL with your girlfriend and she can use the app from anywhere! 🌍

