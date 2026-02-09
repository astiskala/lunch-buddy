interface BodyScrollLockAttributes {
  lockCount: string;
  overflow: string;
  touchAction: string;
}

const defaultBodyScrollLockAttributes: BodyScrollLockAttributes = {
  lockCount: 'data-dialog-scroll-lock-count',
  overflow: 'data-dialog-original-overflow',
  touchAction: 'data-dialog-original-touch-action',
};

export class BodyScrollLockController {
  private isLocked = false;

  constructor(
    private readonly body: HTMLElement,
    private readonly attributes: BodyScrollLockAttributes = defaultBodyScrollLockAttributes
  ) {}

  lock(): void {
    if (this.isLocked) {
      return;
    }

    const rawLockCount = Number.parseInt(
      this.body.getAttribute(this.attributes.lockCount) ?? '0',
      10
    );
    const lockCount =
      Number.isFinite(rawLockCount) && rawLockCount > 0 ? rawLockCount : 0;

    if (lockCount === 0) {
      this.body.setAttribute(
        this.attributes.overflow,
        this.body.style.overflow
      );
      this.body.setAttribute(
        this.attributes.touchAction,
        this.body.style.touchAction
      );
      this.body.style.overflow = 'hidden';
      this.body.style.touchAction = 'none';
    }

    this.body.setAttribute(this.attributes.lockCount, String(lockCount + 1));
    this.isLocked = true;
  }

  unlock(): void {
    if (!this.isLocked) {
      return;
    }

    const lockCount = Number.parseInt(
      this.body.getAttribute(this.attributes.lockCount) ?? '0',
      10
    );
    const nextCount =
      Number.isFinite(lockCount) && lockCount > 0 ? lockCount - 1 : 0;

    if (nextCount === 0) {
      const previousOverflow =
        this.body.getAttribute(this.attributes.overflow) ?? '';
      const previousTouchAction =
        this.body.getAttribute(this.attributes.touchAction) ?? '';

      this.body.style.overflow = previousOverflow;
      this.body.style.touchAction = previousTouchAction;
      this.body.removeAttribute(this.attributes.lockCount);
      this.body.removeAttribute(this.attributes.overflow);
      this.body.removeAttribute(this.attributes.touchAction);
    } else {
      this.body.setAttribute(this.attributes.lockCount, String(nextCount));
    }

    this.isLocked = false;
  }
}

export const closeDialogElement = (dialog: HTMLDialogElement): void => {
  if (dialog.open && typeof dialog.close === 'function') {
    dialog.close();
    return;
  }

  dialog.removeAttribute('open');
};

export const openDialogElement = (
  dialog: HTMLDialogElement,
  onShowModalError: (error: unknown) => void
): void => {
  if (dialog.open) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    try {
      dialog.showModal();
      return;
    } catch (error) {
      onShowModalError(error);
    }
  }

  dialog.setAttribute('open', '');
};
