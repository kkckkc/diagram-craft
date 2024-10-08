import { TbMagnet } from 'react-icons/tb';
import { CanvasSnapPanel } from './CanvasSnapPanel';
import { useSnapManagerProperty } from '../../hooks/useProperty';
import { ToolbarToggleItemWithPopover } from '../../components/ToolbarToggleItemWithPopover';
import { useDiagram } from '../../../application';

export const CanvasSnapToolbarButton = () => {
  const diagram = useDiagram();
  const enabled = useSnapManagerProperty(diagram, 'enabled', true);

  return (
    <ToolbarToggleItemWithPopover value={!!enabled.val} onChange={enabled.set} icon={TbMagnet}>
      <CanvasSnapPanel mode={'panel'} />
    </ToolbarToggleItemWithPopover>
  );
};
