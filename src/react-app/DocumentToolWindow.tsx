import { DiagramDocument } from '../model/diagramDocument.ts';
import { AccordionTrigger } from './AccordionTrigger.tsx';
import { AccordionContent } from './AccordionContext.tsx';
import * as Accordion from '@radix-ui/react-accordion';
import * as Tree from './components/Tree.tsx';
import { Diagram } from '../model/diagram.ts';

const DiagramLabel = (props: { diagram: Diagram } & Pick<Props, 'onValueChange'>) => {
  return (
    <div
      className={'util-action'}
      onClick={() => {
        props.onValueChange(props.diagram.id);
      }}
    >
      {props.diagram.name}
    </div>
  );
};

const DiagramTreeNode = (props: { diagram: Diagram } & Pick<Props, 'value' | 'onValueChange'>) => {
  return (
    <>
      {props.diagram.diagrams.map(node => (
        <Tree.Node key={node.id}>
          <Tree.NodeLabel>
            <DiagramLabel diagram={node} onValueChange={props.onValueChange} />
          </Tree.NodeLabel>
          <Tree.NodeValue>{props.value === node.id ? 'Active' : ''}</Tree.NodeValue>
          {node.diagrams.length > 0 && (
            <DiagramTreeNode
              diagram={node}
              onValueChange={props.onValueChange}
              value={props.value}
            />
          )}
        </Tree.Node>
      ))}
    </>
  );
};

export const DocumentToolWindow = (props: Props) => {
  return (
    <Accordion.Root className="cmp-accordion" type="multiple" defaultValue={['document']}>
      <Accordion.Item className="cmp-accordion__item" value="document">
        <AccordionTrigger>Document structure</AccordionTrigger>
        <AccordionContent>
          <div style={{ margin: '-10px' }}>
            <Tree.Root>
              {props.document.diagrams.map(node => (
                <Tree.Node key={node.id} isOpen={true}>
                  <Tree.NodeLabel>
                    <DiagramLabel diagram={node} onValueChange={props.onValueChange} />
                  </Tree.NodeLabel>
                  <Tree.NodeValue>{props.value === node.id ? 'Active' : ''}</Tree.NodeValue>
                  {node.diagrams.length > 0 && (
                    <Tree.Children>
                      <DiagramTreeNode
                        diagram={node}
                        onValueChange={props.onValueChange}
                        value={props.value}
                      />
                    </Tree.Children>
                  )}
                </Tree.Node>
              ))}
            </Tree.Root>
          </div>
        </AccordionContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  document: DiagramDocument;
};
