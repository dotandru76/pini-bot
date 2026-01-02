$content = @"
---
title: Pini Print Bot
emoji: 🖨️
colorFrom: green
colorTo: gray
sdk: docker
pinned: false
app_port: 7860
---

# Pini - The Smart Print Bot 🤖

This is an automated print calculation bot for 'Defus Beit Yitzhak'.
It uses Gemini AI to process natural language requests and generates PDF quotes using Puppeteer.
"@

Set-Content README.md $content -Encoding UTF8