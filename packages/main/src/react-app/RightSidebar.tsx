import { SideBar, SideBarBottomToolbar, SideBarPage } from './SideBar';
import { TbBadge, TbDatabaseEdit, TbHelpSquare, TbInfoCircle, TbPalette } from 'react-icons/tb';
import { ObjectToolWindow } from './toolwindow/ObjectToolWindow/ObjectToolWindow';
import { ObjectInfoToolWindow } from './toolwindow/ObjectInfoToolWindow/ObjectInfoToolWindow';
import { ObjectDataToolWindow } from './toolwindow/ObjectDataToolWindow/ObjectDataToolWindow';
import { ObjectIndicatorToolWindow } from './toolwindow/ObjectIndicatorToolWindow/ObjectIndicatorToolWindow';
import { ActionToggleButton } from './toolbar/ActionToggleButton';

export const RightSidebar = () => {
  return (
    <SideBar
      side={'right'}
      bottom={
        <SideBarBottomToolbar>
          <ActionToggleButton action={'TOGGLE_HELP'}>
            <TbHelpSquare size={'17.5px'} />
          </ActionToggleButton>
        </SideBarBottomToolbar>
      }
    >
      <SideBarPage icon={TbPalette}>
        <ObjectToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbInfoCircle}>
        <ObjectInfoToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbDatabaseEdit}>
        <ObjectDataToolWindow />
      </SideBarPage>
      <SideBarPage icon={TbBadge}>
        <ObjectIndicatorToolWindow />
      </SideBarPage>
    </SideBar>
  );
};
