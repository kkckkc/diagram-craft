import { useRedraw } from '../../hooks/useRedraw';
import * as Accordion from '@radix-ui/react-accordion';
import { AccordionTrigger } from '../../components/AccordionTrigger';
import { AccordionContent } from '../../components/AccordionContent';
import { useEventListener } from '../../hooks/useEventListener';
import { TbCircleArrowRightFilled, TbCircleDotted } from 'react-icons/tb';
import { useDiagram } from '../../context/DiagramContext';

const formatTimestamp = (ts: Date | undefined) => {
  if (!ts) {
    return '';
  }
  return '[' + ts.toLocaleTimeString() + ']';
};

export const HistoryToolWindow = () => {
  const diagram = useDiagram();
  const redraw = useRedraw();
  useEventListener(diagram.undoManager, 'change', redraw);

  const redoActions = diagram.undoManager.redoableActions;
  const undoActions = diagram.undoManager.undoableActions.toReversed();

  return (
    <Accordion.Root
      className="cmp-accordion"
      disabled={true}
      type="multiple"
      defaultValue={['history']}
    >
      <Accordion.Item className="cmp-accordion__item" value="history">
        <AccordionTrigger>History</AccordionTrigger>
        <AccordionContent>
          <div className={'util-vstack'}>
            {redoActions.map((a, idx) => (
              <div key={idx} className={'util-vcenter util-hgap'}>
                <TbCircleDotted />
                <span>
                  {a.description} {formatTimestamp(a.timestamp)}
                </span>
              </div>
            ))}
            {undoActions.map((a, idx) => (
              <div key={idx} className={'util-vcenter util-hgap'}>
                {idx === 0 && <TbCircleArrowRightFilled />}
                {idx !== 0 && <TbCircleDotted />}
                <span>
                  {a.description} {formatTimestamp(a.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
