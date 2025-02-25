#!/bin/bash

echo "🛠️ Iniciando configuração do ambiente de testes de segurança..."

# Atualizar repositórios
apt-get update && apt-get upgrade -y

# Instalar dependências básicas
apt-get install -y python3 python3-pip golang git

# Instalar ferramentas de reconhecimento
echo "📡 Instalando ferramentas de reconhecimento..."
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/tomnomnom/gf@latest
go install -v github.com/tomnomnom/waybackurls@latest
go install -v github.com/OWASP/Amass/v3/...@latest

# Instalar ffuf
go install -v github.com/ffuf/ffuf@latest

# Criar diretório de trabalho
mkdir -p /opt/security-suite
cd /opt/security-suite

# Clonar wordlists úteis
echo "📚 Baixando wordlists..."
git clone https://github.com/danielmiessler/SecLists.git

# Instalar dependências Python
pip3 install requests python-nmap dnspython censys shodan

# Criar script de automação principal
cat > /opt/security-suite/security_scanner.py << 'EOL'
#!/usr/bin/env python3
import sys
import json
import subprocess
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

app = Flask(__name__)
CORS(app)

def run_subdomain_scan(domain):
    results = []
    
    # Amass enumeration
    try:
        amass_output = subprocess.check_output(
            ['amass', 'enum', '-d', domain],
            stderr=subprocess.STDOUT
        ).decode()
        results.append({"tool": "Amass", "output": amass_output})
    except subprocess.CalledProcessError as e:
        results.append({"tool": "Amass", "error": str(e.output)})

    return results

def run_api_scan(domain):
    results = []
    
    # FFUF scan
    try:
        ffuf_output = subprocess.check_output(
            ['ffuf', '-u', f'https://{domain}/FUZZ', 
             '-w', '/opt/security-suite/SecLists/Discovery/Web-Content/api-endpoints.txt',
             '-mc', '200,201,204,301,302,307,401,403'],
            stderr=subprocess.STDOUT
        ).decode()
        results.append({"tool": "ffuf", "output": ffuf_output})
    except subprocess.CalledProcessError as e:
        results.append({"tool": "ffuf", "error": str(e.output)})

    return results

def run_file_scan(domain):
    results = []
    
    # Nuclei scan for exposed files
    try:
        nuclei_output = subprocess.check_output(
            ['nuclei', '-u', f'https://{domain}', 
             '-t', 'exposures/'],
            stderr=subprocess.STDOUT
        ).decode()
        results.append({"tool": "nuclei", "output": nuclei_output})
    except subprocess.CalledProcessError as e:
        results.append({"tool": "nuclei", "error": str(e.output)})

    return results

def run_webapp_scan(domain):
    results = []
    
    # Nuclei scan for web vulnerabilities
    try:
        nuclei_output = subprocess.check_output(
            ['nuclei', '-u', f'https://{domain}', 
             '-t', 'vulnerabilities/'],
            stderr=subprocess.STDOUT
        ).decode()
        results.append({"tool": "nuclei", "output": nuclei_output})
    except subprocess.CalledProcessError as e:
        results.append({"tool": "nuclei", "error": str(e.output)})

    return results

def run_idor_scan(domain):
    results = []
    
    # Custom IDOR check using httpx
    try:
        httpx_output = subprocess.check_output(
            ['httpx', '-u', f'https://{domain}', 
             '-path', '/api/user/FUZZ', 
             '-w', '1-1000'],
            stderr=subprocess.STDOUT
        ).decode()
        results.append({"tool": "httpx", "output": httpx_output})
    except subprocess.CalledProcessError as e:
        results.append({"tool": "httpx", "error": str(e.output)})

    return results

@app.route('/scan/<scan_type>', methods=['POST'])
def scan(scan_type):
    data = request.get_json()
    domain = data.get('domain')
    
    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    scan_functions = {
        'subdomain': run_subdomain_scan,
        'api': run_api_scan,
        'files': run_file_scan,
        'webapp': run_webapp_scan,
        'idor': run_idor_scan
    }

    if scan_type not in scan_functions:
        return jsonify({"error": "Invalid scan type"}), 400

    def run_scan():
        results = scan_functions[scan_type](domain)
        return jsonify(results)

    # Run scan in background
    thread = threading.Thread(target=run_scan)
    thread.start()
    
    return jsonify({"message": "Scan started", "status": "running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOL

# Tornar o script executável
chmod +x /opt/security-suite/security_scanner.py

# Criar serviço systemd para o scanner
cat > /etc/systemd/system/security-scanner.service << EOL
[Unit]
Description=Security Scanner API Service
After=network.target

[Service]
ExecStart=/opt/security-suite/security_scanner.py
WorkingDirectory=/opt/security-suite
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL

# Habilitar e iniciar o serviço
systemctl enable security-scanner
systemctl start security-scanner

echo "✅ Configuração concluída!"
echo "🌐 API está rodando em http://localhost:5000"
echo "📝 Logs podem ser verificados com: journalctl -u security-scanner"