/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import * as arrays
  from 'phosphor-arrays';

import {
  BoxSizer, boxCalc
} from 'phosphor-boxengine';

import {
  IBoxSizing, boxSizing, sizeLimits
} from 'phosphor-domutil';

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  NodeWrapper
} from 'phosphor-nodewrapper';

import {
  Property
} from 'phosphor-properties';

import {
  ChildMessage, Panel, PanelLayout, ResizeMessage, Widget
} from 'phosphor-widget';

import './index.css';


/**
 * The class name added to SplitPanel instances.
 */
const SPLIT_PANEL_CLASS = 'p-SplitPanel';

/**
 * The class name added to SplitHandle instances.
 */
const SPLIT_HANDLE_CLASS = 'p-SplitHandle';

/**
 * The class name added to a split handle overlay.
 */
const OVERLAY_CLASS = 'p-SplitHandle-overlay';

/**
 * The class name added to horizontal split layout parents and handles.
 */
const HORIZONTAL_CLASS = 'p-mod-horizontal';

/**
 * The class name added to vertical split layout parents and handles.
 */
const VERTICAL_CLASS = 'p-mod-vertical';

/**
 * The class name added to hidden split handles.
 */
const HIDDEN_CLASS = 'p-mod-hidden';


/**
 * The layout orientation of a split layout.
 */
export
enum Orientation {
  /**
   * Left-to-right horizontal orientation.
   */
  Horizontal,

  /**
   * Top-to-bottom vertical orientation.
   */
  Vertical,
}


/**
 * A panel which arranges its children into resizable sections.
 *
 * #### Notes
 * This class provides a convenience wrapper around a [[SplitLayout]].
 */
export
class SplitPanel extends Panel {
  /**
   * Create a split layout for a split panel.
   */
  static createLayout(): SplitLayout {
    return new SplitLayout();
  }

  /**
   * Construct a new split panel.
   */
  constructor() {
    super();
    this.addClass(SPLIT_PANEL_CLASS);
  }

  /**
   * Get the layout orientation for the split panel.
   */
  get orientation(): Orientation {
    return (this.layout as SplitLayout).orientation;
  }

  /**
   * Set the layout orientation for the split panel.
   */
  set orientation(value: Orientation) {
    (this.layout as SplitLayout).orientation = value;
  }

  /**
   * Get the inter-element spacing for the split panel.
   */
  get spacing(): number {
    return (this.layout as SplitLayout).spacing;
  }

  /**
   * Set the inter-element spacing for the split panel.
   */
  set spacing(value: number) {
    (this.layout as SplitLayout).spacing = value;
  }
}


/**
 * The namespace for the `SplitPanel` class statics.
 */
export
namespace SplitPanel {
  /**
   * A convenience alias of the `Horizontal` [[Orientation]].
   */
  export
  const Horizontal = Orientation.Horizontal;

  /**
   * A convenience alias of the `Vertical` [[Orientation]].
   */
  export
  const Vertical = Orientation.Vertical;

  /**
   * Get the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The split panel stretch factor for the widget.
   */
  export
  function getStretch(widget: Widget): number {
    return SplitLayout.getStretch(widget);
  }

  /**
   * Set the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param value - The value for the stretch factor.
   */
  export
  function setStretch(widget: Widget, value: number): void {
    SplitLayout.setStretch(widget, value);
  }
}


/**
 * A layout which arranges its children into resizable sections.
 */
export
class SplitLayout extends PanelLayout {
  /**
   * Get the layout orientation for the split layout.
   */
  get orientation(): Orientation {
    return SplitLayoutPrivate.orientationProperty.get(this);
  }

  /**
   * Set the layout orientation for the split layout.
   */
  set orientation(value: Orientation) {
    SplitLayoutPrivate.orientationProperty.set(this, value);
  }

  /**
   * Get the inter-element spacing for the split layout.
   */
  get spacing(): number {
    return SplitLayoutPrivate.spacingProperty.get(this);
  }

  /**
   * Set the inter-element spacing for the split layout.
   */
  set spacing(value: number) {
    SplitLayoutPrivate.spacingProperty.set(this, value);
  }

  /**
   * Initialize the children of the layout.
   *
   * #### Notes
   * This method is called automatically when the layout is installed
   * on its parent widget.
   */
  protected initialize(): void {
    SplitLayoutPrivate.initialize(this);
    super.initialize();
  }

  /**
   * Attach a child widget to the parent's DOM node.
   *
   * @param index - The current index of the child in the layout.
   *
   * @param child - The child widget to attach to the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected attachChild(index: number, child: Widget): void {
    let handle = SplitLayoutPrivate.splitHandleProperty.get(child);
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    let average = SplitLayoutPrivate.averageSize(sizers);
    let sizer = SplitLayoutPrivate.createSizer(average);
    arrays.insert(sizers, index, sizer);
    this.parent.node.appendChild(child.node);
    this.parent.node.appendChild(handle.node);
    if (this.parent.isAttached) sendMessage(child, Widget.MsgAfterAttach);
    this.parent.fit();
  }

  /**
   * Move a child widget in the parent's DOM node.
   *
   * @param fromIndex - The previous index of the child in the layout.
   *
   * @param toIndex - The current index of the child in the layout.
   *
   * @param child - The child widget to move in the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected moveChild(fromIndex: number, toIndex: number, child: Widget): void {
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    arrays.move(sizers, fromIndex, toIndex);
    this.parent.fit();  // fit instead of update to show/hide handles
  }

  /**
   * Detach a child widget from the parent's DOM node.
   *
   * @param index - The previous index of the child in the layout.
   *
   * @param child - The child widget to detach from the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected detachChild(index: number, child: Widget): void {
    let handle = SplitLayoutPrivate.splitHandleProperty.get(child);
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    arrays.removeAt(sizers, index);
    if (this.parent.isAttached) sendMessage(child, Widget.MsgBeforeDetach);
    this.parent.node.removeChild(child.node);
    this.parent.node.removeChild(handle.node);
    SplitLayoutPrivate.resetGeometry(child);
    this.parent.fit();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.parent.update();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.parent.fit();
  }

  /**
   * A message handler invoked on a `'child-shown'` message.
   */
  protected onChildShown(msg: ChildMessage): void {
    // IE paints before firing animation frame callbacks when toggling
    // `display: none`. This causes flicker, so IE is fit immediately.
    if (SplitLayoutPrivate.IsIE) {
      sendMessage(this.parent, Widget.MsgFitRequest);
    } else {
      this.parent.fit();
    }
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: ChildMessage): void {
    // IE paints before firing animation frame callbacks when toggling
    // `display: none`. This causes flicker, so IE is fit immediately.
    if (SplitLayoutPrivate.IsIE) {
      sendMessage(this.parent, Widget.MsgFitRequest);
    } else {
      this.parent.fit();
    }
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (this.parent.isVisible) {
      SplitLayoutPrivate.update(this, msg.width, msg.height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.parent.isVisible) {
      SplitLayoutPrivate.update(this, -1, -1);
    }
  }

  /**
   * A message handler invoked on a `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    if (this.parent.isAttached) {
      SplitLayoutPrivate.fit(this);
    }
  }
}


/**
 * The namespace for the `SplitLayout` class statics.
 */
export
namespace SplitLayout {
  /**
   * A convenience alias of the `Horizontal` [[Orientation]].
   */
  export
  const Horizontal = Orientation.Horizontal;

  /**
   * A convenience alias of the `Vertical` [[Orientation]].
   */
  export
  const Vertical = Orientation.Vertical;

  /**
   * Get the split layout stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The split layout stretch factor for the widget.
   */
  export
  function getStretch(widget: Widget): number {
    return SplitLayoutPrivate.stretchProperty.get(widget);
  }

  /**
   * Set the split layout stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param value - The value for the stretch factor.
   */
  export
  function setStretch(widget: Widget, value: number): void {
    SplitLayoutPrivate.stretchProperty.set(widget, value);
  }
}


/**
 * A class which manages a handle node for a split layout.
 */
class SplitHandle extends NodeWrapper {
  /**
   * Create the DOM node for a split handle.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    node.appendChild(overlay);
    return node;
  }

  /**
   * Construct a new split handle.
   */
  constructor() {
    super();
    this.addClass(SPLIT_HANDLE_CLASS);
  }

  /**
   * Set whether the handle is hidden.
   */
  setHidden(value: boolean) {
    this.toggleClass(HIDDEN_CLASS, value);
  }

  /**
   * Set the orientation of the handle.
   */
  setOrientation(value: Orientation) {
    this.toggleClass(HORIZONTAL_CLASS, value === Orientation.Horizontal);
    this.toggleClass(VERTICAL_CLASS, value === Orientation.Vertical);
  }

  /**
   * Set the geometry for the handle.
   */
  setGeometry(left: number, top: number, width: number, height: number): void {
    let style = this.node.style;
    style.top = top + 'px';
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
  }
}


/**
 * The namespace for the `SplitLayout` class private data.
 */
namespace SplitLayoutPrivate {
  /**
   * A flag indicating whether the browser is IE.
   */
  export
  const IsIE = /Trident/.test(navigator.userAgent);

  /**
   * The property descriptor for the split layout orientation.
   */
  export
  const orientationProperty = new Property<SplitLayout, Orientation>({
    name: 'orientation',
    value: Orientation.Horizontal,
    changed: onOrientationChanged,
  });

  /**
   * The property descriptor for the split layout spacing.
   */
  export
  const spacingProperty = new Property<SplitLayout, number>({
    name: 'spacing',
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onSpacingChanged,
  });

  /**
   * The property descriptor for the split layout sizers.
   */
  export
  const sizersProperty = new Property<SplitLayout, BoxSizer[]>({
    name: 'sizers',
    create: () => [],
  });

  /**
   * The property descriptor for a widget stretch factor.
   */
  export
  const stretchProperty = new Property<Widget, number>({
    name: 'stretch',
    value: 0,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onChildPropertyChanged,
  });

  /**
   * The property descriptor for a widget split handle.
   */
  export
  const splitHandleProperty = new Property<Widget, SplitHandle>({
    name: 'splitHandle',
    create: owner => new SplitHandle(),
  });

  /**
   * Create a new box sizer with the given size hint.
   */
  export
  function createSizer(size: number): BoxSizer {
    let sizer = new BoxSizer();
    sizer.sizeHint = size | 0;
    return sizer;
  }

  /**
   * Compute the average size of the given box sizers.
   */
  export
  function averageSize(sizers: BoxSizer[]): number {
    if (sizers.length === 0) return 0;
    return sizers.reduce((v, s) => v + s.size, 0) / sizers.length;
  }

  /**
   * Initialize the private layout state.
   *
   * #### Notes
   * This should be called during layout initialization.
   */
  export
  function initialize(layout: SplitLayout): void {
    updateParentOrientation(layout);
  }

  /**
   * Reset the layout geometry for the given child widget.
   */
  export
  function resetGeometry(widget: Widget): void {
    let rect = rectProperty.get(widget);
    let style = widget.node.style;
    rect.top = NaN;
    rect.left = NaN;
    rect.width = NaN;
    rect.height = NaN;
    style.top = '';
    style.left = '';
    style.width = '';
    style.height = '';
  }

  /**
   * Fit the layout to the total size required by the child widgets.
   */
  export
  function fit(layout: SplitLayout): void {
    // Bail early if there is no parent.
    let parent = layout.parent;
    if (!parent) {
      return;
    }

    // Update the handles and track the visible widget count.
    let visibleCount = 0;
    let orientation = layout.orientation;
    let lastVisibleHandle: SplitHandle = null;
    for (let i = 0, n = layout.childCount(); i < n; ++i) {
      let widget = layout.childAt(i);
      let handle = splitHandleProperty.get(widget);
      handle.setHidden(widget.isHidden);
      handle.setOrientation(orientation);
      if (!widget.isHidden) {
        lastVisibleHandle = handle;
        visibleCount++;
      }
    }

    // Hide the last visible handle and update the fixed spacing.
    if (lastVisibleHandle) lastVisibleHandle.setHidden(true);
    let fixedSpace = layout.spacing * Math.max(0, visibleCount - 1);
    fixedSpaceProperty.set(layout, fixedSpace);

    // Update the sizers and compute the new size limits.
    let minW = 0;
    let minH = 0;
    let maxW = Infinity;
    let maxH = Infinity;
    let sizers = sizersProperty.get(layout);
    if (orientation === Orientation.Horizontal) {
      minW = fixedSpace;
      maxW = visibleCount > 0 ? minW : maxW;
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        let sizer = sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.isHidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = stretchProperty.get(widget);
        sizer.minSize = limits.minWidth;
        sizer.maxSize = limits.maxWidth;
        minW += limits.minWidth;
        maxW += limits.maxWidth;
        minH = Math.max(minH, limits.minHeight);
        maxH = Math.min(maxH, limits.maxHeight);
      }
    } else {
      minH = fixedSpace;
      maxH = visibleCount > 0 ? minH : maxH;
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        let sizer = sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.isHidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = stretchProperty.get(widget);
        sizer.minSize = limits.minHeight;
        sizer.maxSize = limits.maxHeight;
        minH += limits.minHeight;
        maxH += limits.maxHeight;
        minW = Math.max(minW, limits.minWidth);
        maxW = Math.min(maxW, limits.maxWidth);
      }
    }

    // Update the box sizing and add it to the size constraints.
    let box = boxSizing(parent.node);
    boxSizingProperty.set(parent, box);
    minW += box.horizontalSum;
    minH += box.verticalSum;
    maxW += box.horizontalSum;
    maxH += box.verticalSum;

    // Update the panel's size constraints.
    let style = parent.node.style;
    style.minWidth = minW + 'px';
    style.minHeight = minH + 'px';
    style.maxWidth = maxW === Infinity ? 'none' : maxW + 'px';
    style.maxHeight = maxH === Infinity ? 'none' : maxH + 'px';

    // Notify the ancestor that it should fit immediately.
    if (parent.parent) sendMessage(parent.parent, Widget.MsgFitRequest);

    // Notify the parent that it should update immediately.
    sendMessage(parent, Widget.MsgUpdateRequest);
  }

  /**
   * Layout the children using the given offset width and height.
   *
   * If the dimensions are unknown, they should be specified as `-1`.
   */
  export
  function update(layout: SplitLayout, offsetWidth: number, offsetHeight: number): void {
    // Bail early if their are no children to layout.
    if (layout.childCount() === 0) {
      return;
    }

    // Bail early if there is no parent.
    let parent = layout.parent;
    if (!parent) {
      return;
    }

    // Measure the parent if the offset dimensions are unknown.
    if (offsetWidth < 0) {
      offsetWidth = parent.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = parent.node.offsetHeight;
    }

    // Lookup the layout data.
    let spacing = layout.spacing;
    let orientation = layout.orientation;
    let box = boxSizingProperty.get(parent);
    let sizers = sizersProperty.get(layout);
    let fixedSpace = fixedSpaceProperty.get(layout);

    // Compute the actual layout bounds adjusted for border and padding.
    let top = box.paddingTop;
    let left = box.paddingLeft;
    let width = offsetWidth - box.horizontalSum;
    let height = offsetHeight - box.verticalSum;

    // // Update the sizer hints if there is a pending `setSizes`.
    // if (this._pendingSizes) {
    //   let space = horizontal ? width : height;
    //   let adjusted = Math.max(0, space - this._fixedSpace);
    //   for (let i = 0, n = this._sizers.length; i < n; ++i) {
    //     this._sizers[i].sizeHint *= adjusted;
    //   }
    //   this._pendingSizes = false;
    // }

    // Distribute the layout space and layout the children.
    if (orientation === Orientation.Horizontal) {
      boxCalc(sizers, Math.max(0, width - fixedSpace));
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        if (widget.isHidden) {
          continue;
        }
        let size = sizers[i].size;
        let handle = splitHandleProperty.get(widget);
        setGeometry(widget, left, top, size, height);
        handle.setGeometry(left + size, top, spacing, height);
        left += size + spacing;
      }
    } else {
      boxCalc(sizers, Math.max(0, height - fixedSpace));
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        if (widget.isHidden) {
          continue;
        }
        let size = sizers[i].size;
        let handle = splitHandleProperty.get(widget);
        setGeometry(widget, left, top, width, size);
        handle.setGeometry(left, top + size, width, spacing);
        top += size + spacing;
      }
    }
  }

  /**
   * An object which represents an offset rect.
   */
  interface IRect {
    /**
     * The offset top edge, in pixels.
     */
    top: number;

    /**
     * The offset left edge, in pixels.
     */
    left: number;

    /**
     * The offset width, in pixels.
     */
    width: number;

    /**
     * The offset height, in pixels.
     */
    height: number;
  }

  /**
   * A property descriptor for a widget offset rect.
   */
  var rectProperty = new Property<Widget, IRect>({
    name: 'rect',
    create: () => ({ top: NaN, left: NaN, width: NaN, height: NaN }),
  });

  /**
   * A property descriptor for the box sizing of a widget.
   */
  var boxSizingProperty = new Property<Widget, IBoxSizing>({
    name: 'boxSizing',
    create: owner => boxSizing(owner.node),
  });

  /**
   * A property descriptor for the box layout fixed spacing.
   */
  var fixedSpaceProperty = new Property<SplitLayout, number>({
    name: 'fixedSpace',
    value: 0,
  });

  /**
   * The change handler for the split layout orientation.
   */
  function onOrientationChanged(layout: SplitLayout): void {
    updateParentOrientation(layout);
    if (layout.parent) layout.parent.fit();
  }

  /**
   * The change handler for the split layout spacing.
   */
  function onSpacingChanged(layout: SplitLayout): void {
    if (layout.parent) layout.parent.fit();
  }

  /**
   * The change handler for the attached child properties.
   */
  function onChildPropertyChanged(child: Widget): void {
    let parent = child.parent;
    let layout = parent && parent.layout;
    if (layout instanceof SplitLayout) parent.fit();
  }

  /**
   * Update the CSS orientation class on the layout parent.
   */
  function updateParentOrientation(layout: SplitLayout): void {
    if (!layout.parent) return;
    let parent = layout.parent;
    let orient = layout.orientation;
    parent.toggleClass(HORIZONTAL_CLASS, orient === Orientation.Horizontal);
    parent.toggleClass(VERTICAL_CLASS, orient === Orientation.Vertical);
  }

  /**
   * Set the offset geometry for the given widget.
   *
   * A resize message will be dispatched to the widget if appropriate.
   */
  function setGeometry(widget: Widget, left: number, top: number, width: number, height: number): void {
    let resized = false;
    let style = widget.node.style;
    let rect = rectProperty.get(widget);
    if (rect.top !== top) {
      rect.top = top;
      style.top = top + 'px';
    }
    if (rect.left !== left) {
      rect.left = left;
      style.left = left + 'px';
    }
    if (rect.width !== width) {
      resized = true;
      rect.width = width;
      style.width = width + 'px';
    }
    if (rect.height !== height) {
      resized = true;
      rect.height = height;
      style.height = height + 'px';
    }
    if (resized) {
      sendMessage(widget, new ResizeMessage(width, height));
    }
  }
}
