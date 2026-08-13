import asyncio
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/publish_check")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        # Use the width/height specified in instructions
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # 1. Start at the preview URL
        print("Navigating to preview...")
        await page.goto("http://localhost:8080", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_initial_load.png"))
        
        # 2. Log any console errors immediately
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        
        # 3. Check for specific "Publish" or "Update" button if visible (though usually it's in the Lovable frame)
        # Since I can't interact with the editor UI itself via localhost:8080, 
        # I'll check if there are runtime errors preventing the app from working correctly.
        
        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(SCREENSHOTS / "2_after_wait.png"))
        
        # Check network requests for failed auth/db calls
        print("Checking for runtime state...")
        content = await page.content()
        if "Supabase credentials missing" in content:
            print("OBSERVATION: App reports missing Supabase credentials in UI.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
