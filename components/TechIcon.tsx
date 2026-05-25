import {
  SiApachespark,
  SiApachekafka,
  SiApacheairflow,
  SiDbt,
  SiTerraform,
  SiGitlab,
  SiDocker,
  SiKubernetes,
  SiAnsible,
  SiJenkins,
  SiPython,
  SiPytorch,
  SiLangchain,
} from 'react-icons/si';
import { IconType } from 'react-icons';

const iconMap: Record<string, IconType> = {
  'Apache Spark': SiApachespark,
  'Apache Kafka': SiApachekafka,
  'Apache Airflow': SiApacheairflow,
  'dbt': SiDbt,
  'Terraform': SiTerraform,
  'GitLab CI': SiGitlab,
  'Docker': SiDocker,
  'Kubernetes': SiKubernetes,
  'Ansible': SiAnsible,
  'Jenkins': SiJenkins,
  'Python': SiPython,
  'PyTorch': SiPytorch,
  'LangChain': SiLangchain,
};

export function TechIcon({ name, color }: { name: string; color: string }) {
  const Icon = iconMap[name];
  if (Icon) {
    return <Icon size={14} style={{ color, flexShrink: 0 }} />;
  }
  return (
    <div
      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}
