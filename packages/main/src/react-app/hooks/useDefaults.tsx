import { useConfiguration } from '../context/ConfigurationContext';

export const useNodeDefaults = () => {
  const config = useConfiguration();
  return config.defaults.node;
};

export const useEdgeDefaults = () => {
  const config = useConfiguration();
  return config.defaults.edge;
};
