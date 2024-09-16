import { SideBar, SideBarPage } from './SideBar';
import { TbCheck, TbFile, TbHistory, TbPentagonPlus, TbSearch, TbStack } from 'react-icons/tb';
import { PickerToolWindow } from './toolwindow/PickerToolWindow/PickerToolWindow';
import { LayerToolWindow } from './toolwindow/LayerToolWindow/LayerToolWindow';
import { SelectToolWindow } from './toolwindow/SelectToolWindow/SelectToolWindow';
import { DocumentToolWindow } from './toolwindow/DocumentToolWindow/DocumentToolWindow';
import { HistoryToolWindow } from './toolwindow/HistoryToolWindow/HistoryToolWindow';
import { QueryToolWindow } from './toolwindow/QueryToolWindow/QueryToolWindow';
import { makeActionMap } from '@diagram-craft/canvas/keyMap';
import { defaultAppActions } from './appActionMap';
import { useApplication } from '../application';

export const LeftSidebar = () => {
  const application = useApplication();
  return (
    <SideBar side={'left'}>
      <SideBarPage icon={TbPentagonPlus}>
        <PickerToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbStack}>
        <LayerToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbCheck}>
        <SelectToolWindow diagram={application.model.activeDiagram} />
      </SideBarPage>
      <SideBarPage icon={TbFile}>
        <DocumentToolWindow
          document={application.model.activeDocument}
          value={application.model.activeDiagram.id}
          onValueChange={v => {
            application.model.activeDiagram = application.model.activeDocument.getById(v)!;
            application.actions = makeActionMap(defaultAppActions)(application);
          }}
        />
      </SideBarPage>
      <SideBarPage icon={TbHistory}>
        <HistoryToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbSearch}>
        <QueryToolWindow />
      </SideBarPage>
    </SideBar>
  );
};
