import { useState } from 'react';
import { DiagramDocument } from '@diagram-craft/model';
import { Select } from './components/Select';

export const DocumentSelector = (props: Props) => {
  const [selectedDiagram, setSelectedDiagram] = useState(props.defaultValue);

  return (
    <Select
      onValueChange={v => {
        setSelectedDiagram(Number(v));
        props.onChange(props.diagrams[Number(v)].document);
      }}
      value={selectedDiagram.toString()}
      values={props.diagrams.map((d, idx) => ({ value: idx.toString(), label: d.name }))}
    />
  );
};

type Props = {
  diagrams: {
    name: string;
    document: DiagramDocument;
  }[];
  defaultValue: number;
  onChange: (document: DiagramDocument) => void;
};
