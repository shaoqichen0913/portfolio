export const experience = [
  {
    period: '2024 – 2026',
    role: { en: 'Data Engineer, LLM & AI (Focus)', de: 'Data Engineer, LLM & KI (Schwerpunkt)' },
    company: 'TruBridge GmbH',
    location: 'Mannheim',
    description: {
      en: 'Led development of an internal News Intelligence Platform — news ingestion via News API, semantic search, RAG system, and LLM pipeline for automated summarization and analysis.',
      de: 'Leitung der Entwicklung einer internen News-Intelligence-Plattform — News-Ingestion via News-API, semantische Suche, RAG-System und LLM-Pipeline für automatisierte Zusammenfassung und Analyse.',
    },
    tags: ['Python', 'LangChain', 'LangGraph', 'RAG', 'LLM', 'News API', 'Vector DBs'],
    current: false,
  },
  {
    period: '2023 – 2026',
    role: { en: 'DevOps Engineer, Cloud Data Services (Contract)', de: 'DevOps Engineer, Cloud Data Services (Contract)' },
    company: 'Major European Rail Operator',
    location: 'Mannheim',
    description: {
      en: 'Maintained and operated a large-scale cloud data platform in an air-gapped AWS environment. Managed infrastructure as code, CI/CD pipelines, and platform auth (Kerberos/mTLS/AzureAD SSO).',
      de: 'Betrieb und Wartung einer großen Cloud-Datenplattform in einer air-gapped AWS-Umgebung. Verwaltung von Infrastructure as Code, CI/CD-Pipelines und Plattform-Authentifizierung.',
    },
    tags: ['AWS', 'Terraform', 'Airflow', 'Kafka', 'Kerberos', 'Ansible', 'GitLab CI', 'JupyterHub'],
    current: false,
  },
  {
    period: '2021 – 2024',
    role: { en: 'Data Engineer', de: 'Data Engineer' },
    company: 'TruBridge GmbH',
    location: 'Mannheim',
    description: {
      en: 'Designed and built data pipelines and lakehouse infrastructure for healthcare data using Apache Spark, dbt, and Apache Iceberg.',
      de: 'Entwurf und Aufbau von Datenpipelines und Lakehouse-Infrastruktur für Gesundheitsdaten mit Apache Spark, dbt und Apache Iceberg.',
    },
    tags: ['Spark', 'Python', 'dbt', 'Apache Iceberg', 'SQL', 'Delta Lake'],
    current: false,
  },
];

export const techStack = {
  dataEngineering: [
    { name: 'Apache Spark', color: '#E25A1C' },
    { name: 'Apache Kafka', color: '#1A7BC4' },
    { name: 'Apache Airflow', color: '#017CEE' },
    { name: 'dbt', color: '#FF694A' },
    { name: 'Apache Iceberg', color: '#3B8FCC' },
    { name: 'Delta Lake', color: '#00ADD8' },
    { name: 'Trino', color: '#DD00A1' },
    { name: 'AWS EMR', color: '#FF9900' },
    { name: 'AWS Redshift', color: '#8C4FFF' },
    { name: 'AWS Athena', color: '#FF9900' },
  ],
  devops: [
    { name: 'Terraform', color: '#623CE4' },
    { name: 'GitLab CI', color: '#FC6D26' },
    { name: 'AWS', color: '#FF9900' },
    { name: 'Docker', color: '#2396ED' },
    { name: 'Kubernetes', color: '#326CE5' },
    { name: 'Ansible', color: '#EE0000' },
    { name: 'Jenkins', color: '#D24939' },
  ],
  ai: [
    { name: 'LangChain', color: '#1C7B4F' },
    { name: 'LangGraph', color: '#412991' },
    { name: 'RAG', color: '#6366F1' },
    { name: 'Python', color: '#3776AB' },
    { name: 'Vector DBs', color: '#00B4D8' },
  ],
};
