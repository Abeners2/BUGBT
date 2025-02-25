import React, { useState } from 'react';
import { Shield, Search, File, Bug, Key, AlertTriangle } from 'lucide-react';

interface TestResult {
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any[];
}

function App() {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testType: string) => {
    setLoading(true);
    setResults(prev => ({
      ...prev,
      [testType]: {
        status: 'pending',
        message: 'Executando teste...'
      }
    }));

    try {
      const response = await fetch(`http://localhost:5000/scan/${testType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [testType]: {
            status: 'success',
            message: 'Teste concluído com sucesso!',
            details: data
          }
        }));
      } else {
        throw new Error(data.error || 'Erro ao executar o teste');
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testType]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testOptions = [
    {
      id: 'subdomain',
      title: 'Verificação de Subdomínios',
      description: 'Detecta subdomínios órfãos e possíveis takeovers usando Amass',
      icon: Shield
    },
    {
      id: 'api',
      title: 'Análise de APIs',
      description: 'Busca por endpoints sensíveis usando ffuf',
      icon: Search
    },
    {
      id: 'files',
      title: 'Arquivos Temporários',
      description: 'Procura por arquivos sensíveis usando nuclei',
      icon: File
    },
    {
      id: 'webapp',
      title: 'Vulnerabilidades Web',
      description: 'Testa XSS, SQLi e outros vetores usando nuclei',
      icon: Bug
    },
    {
      id: 'idor',
      title: 'Teste de IDOR',
      description: 'Verifica referências diretas a objetos usando httpx',
      icon: Key
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Plataforma de Testes de Segurança
          </h1>
          <p className="text-lg text-gray-600">
            Ferramenta completa para análise de segurança web
          </p>
        </div>

        <div className="mb-8">
          <div className="max-w-xl mx-auto">
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domínio Alvo
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="exemplo.com.br"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4 py-2"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testOptions.map((option) => (
            <div
              key={option.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <option.icon className="w-6 h-6 text-blue-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{option.description}</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => runTest(option.id)}
                  disabled={!domain || loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Iniciar Teste
                </button>

                {results[option.id] && (
                  <div className={`p-4 rounded-lg ${
                    results[option.id].status === 'success' ? 'bg-green-50' : 
                    results[option.id].status === 'error' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    <p className={`text-sm ${
                      results[option.id].status === 'success' ? 'text-green-700' :
                      results[option.id].status === 'error' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {results[option.id].message}
                    </p>
                    {results[option.id].details && (
                      <pre className="mt-2 text-xs overflow-auto max-h-40">
                        {JSON.stringify(results[option.id].details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-blue-800 mb-2">
                Como Utilizar
              </h4>
              <p className="text-blue-700">
                Para começar a usar esta ferramenta:
              </p>
              <ol className="list-decimal list-inside mt-2 text-blue-700 space-y-1">
                <li>Execute o script setup-kali.sh como root no seu Kali Linux</li>
                <li>Aguarde a instalação e configuração das ferramentas</li>
                <li>A API estará disponível em http://localhost:5000</li>
                <li>Digite o domínio alvo no campo acima</li>
                <li>Selecione o tipo de teste que deseja executar</li>
                <li>Aguarde os resultados que serão exibidos abaixo de cada teste</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;