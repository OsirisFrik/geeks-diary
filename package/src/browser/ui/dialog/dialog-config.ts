export type DialogRole = 'dialog' | 'alertdialog';


export class DialogConfig<D = any> {
    id?: string;
    autoFocus?: boolean = true;
    disableClose?: boolean = false;
    hasBackdrop?: boolean = true;
    minWidth?: string;
    minHeight?: string;
    maxWidth?: string;
    maxHeight?: string;
    width?: string = '';
    height?: string = '';
    data?: D;
    role?: DialogRole = 'dialog';
}