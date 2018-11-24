import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { select, Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Dialog } from '../ui/dialog';
import { TabControl } from '../ui/tabs/tab-control';
import { VcsCommitDialogComponent, VcsCommitDialogData, VcsCommitDialogResult } from './vcs-commit';
import { VCS_ITEM_LIST_MANAGER, VcsItemListManager, VcsItemListManagerFactory } from './vcs-view';
import { VcsStateWithRoot } from './vcs.state';


@Component({
    selector: 'gd-vcs-manager',
    templateUrl: './vcs-manager.component.html',
    styleUrls: ['./vcs-manager.component.scss'],
})
export class VcsManagerComponent implements OnInit, OnDestroy, AfterViewInit {
    /** Control for tabs. */
    readonly tabControl = new TabControl([
        { name: 'Changes', value: 'gd-vcs-manager-changes' },
        { name: 'History', value: 'gd-vcs-manager-history' },
    ]);

    /** Form control for all select checkbox. */
    readonly allSelectCheckboxFormControl = new FormControl(false);
    allSelectCheckboxIndeterminate = false;

    @ViewChild('itemList') _itemList: ElementRef<HTMLElement>;

    private itemListManager: VcsItemListManager;

    private fileChangesSubscription = Subscription.EMPTY;
    private allSelectChangeSubscription = Subscription.EMPTY;
    private selectionChangeSubscription = Subscription.EMPTY;

    constructor(
        @Inject(VCS_ITEM_LIST_MANAGER) private itemListManagerFactory: VcsItemListManagerFactory,
        public _viewContainerRef: ViewContainerRef,
        private store: Store<VcsStateWithRoot>,
        private dialog: Dialog,
    ) {
    }

    get selectedFileChangesCount(): number {
        if (this.itemListManager) {
            return this.itemListManager._selectedItems.size;
        } else {
            return 0;
        }
    }

    ngOnInit(): void {
        this.fileChangesSubscription = this.store.pipe(
            select(state => state.vcs.vcs.fileChanges),
        ).subscribe((fileChanges) => {
            if (fileChanges.length === 0) {
                this.allSelectCheckboxFormControl.disable();
            } else {
                this.allSelectCheckboxFormControl.enable();
            }

            if (this.itemListManager && this.itemListManager.ready) {
                this.itemListManager.initWithFileChanges(fileChanges);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.itemListManager) {
            this.itemListManager.destroy();
        }

        this.fileChangesSubscription.unsubscribe();
        this.allSelectChangeSubscription.unsubscribe();
        this.selectionChangeSubscription.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.itemListManager = this.itemListManagerFactory(this._itemList.nativeElement, this._viewContainerRef);

        this.store.pipe(
            select(state => state.vcs.vcs.fileChanges),
            take(1),
        ).subscribe((fileChanges) => {
            // We should initialize components on next tick.
            // Otherwise we will get 'ExpressionChangedAfterItHasBeenCheckedError'.
            Promise.resolve(null).then(() => {
                this.itemListManager.initWithFileChanges(fileChanges);
            });
        });

        // All select checkbox -> item list manager
        this.allSelectChangeSubscription = this.allSelectCheckboxFormControl.valueChanges
            .subscribe((checked) => {
                if (checked as boolean) {
                    this.itemListManager.selectAllItems();
                } else {
                    this.itemListManager.deselectAllItems();
                }
            });

        // Item list manger -> all select checkbox
        this.selectionChangeSubscription = this.itemListManager.selectionChanges
            .subscribe(() => {
                if (this.itemListManager.areAllItemsSelected()) {
                    this.allSelectCheckboxFormControl.setValue(true, { emitEvent: false });
                    this.allSelectCheckboxIndeterminate = false;
                } else {
                    this.allSelectCheckboxFormControl.setValue(false, { emitEvent: false });
                    this.allSelectCheckboxIndeterminate = !this.itemListManager.isEmptySelection();
                }
            });
    }

    openCommitDialog(): void {
        if (!this.itemListManager) {
            return;
        }

        const fileChanges = this.itemListManager
            .getSelectedItems()
            .reduce((all, item) => all.concat(...item._config.fileChanges), []);

        this.dialog.open<VcsCommitDialogComponent,
            VcsCommitDialogData,
            VcsCommitDialogResult>(
            VcsCommitDialogComponent,
            {
                width: '700px',
                maxHeight: '75vh',
                disableBackdropClickClose: true,
                data: { fileChanges },
            },
        );
    }
}
