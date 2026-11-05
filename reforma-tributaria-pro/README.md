# Contábil Inteligente PRO — Reforma Tributária

Primeira versão de um painel individual para apoiar profissionais contábeis na análise da transição da tributação sobre o consumo no Brasil.

## Executar localmente

```bash
cd reforma-tributaria-pro
npm install
npm run dev
```

Para gerar a versão de produção: `npm run build`.

## O que já existe

- Dashboard com empresa demonstrativa e indicadores calculados.
- Simulador comparativo simplificado entre carga atual informada e cenário estimado CBS/IBS.
- Premissas editáveis de receita, compras, alíquotas e percentual potencialmente creditável.
- Cronograma geral de transição 2026–2033.
- Checklist profissional e links para referências normativas oficiais.
- Layout responsivo.

## Limites importantes

Esta é uma demonstração inicial, não um sistema de apuração. Os percentuais são premissas editáveis pelo usuário e não devem ser tratados como alíquotas legais aplicáveis. A estimativa não contempla regimes específicos, reduções, regras de crédito por operação, regimes favorecidos, split payment, saldos, documentos fiscais ou todas as demais particularidades. Validar legislação e regulamentação vigentes para cada período.

## Próximas etapas recomendadas

1. Cadastro completo de empresas, CNAE, NCM, NBS e operações.
2. Motor de regras tributárias versionado por vigência e fundamento legal.
3. Simulação por produto/serviço, regime e perfil de cliente.
4. Importação e validação de XML de NF-e/NFS-e.
5. Testes automatizados com casos revisados por profissional.
6. Persistência segura, autenticação e trilha de auditoria.
