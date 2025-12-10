#!/bin/bash
# Lyra Cutout - GitHub Setup Script
# 
# 使用步骤 / Usage Steps:
# 
# 1. 在 GitHub 网站创建新仓库 / Create a new repository on GitHub:
#    - 名称 / Name: lyra-cutout
#    - 描述 / Description: AI-Powered Batch Background Removal Tool | AI 智能批量抠图工具
#    - 不要初始化 README、.gitignore 或 License（我们已经有了）
#    - Do NOT initialize with README, .gitignore or License (we already have them)
#
# 2. 创建仓库后，运行以下命令 / After creating the repo, run:

# 添加远程仓库 / Add remote
git remote add origin https://github.com/petehsu/lyra-cutout.git

# 推送到 GitHub / Push to GitHub
git push -u origin main

echo "✅ Done! Visit https://github.com/petehsu/lyra-cutout"
