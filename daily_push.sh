#!/bin/bash

# Date format YYYY-MM-DD
DATE=$(date +%F)

# Step 1: Add all changes
git add .

# Step 2: Commit with today's date
git commit -m "Update on $DATE"

# Step 3: Push to main branch
git push origin main

# Step 4: Create tag with date
git tag -a "$DATE" -m "Version for $DATE"

# Step 5: Push the tag
git push origin "$DATE"

echo "✅ Project updated and tagged with date: $DATE"
