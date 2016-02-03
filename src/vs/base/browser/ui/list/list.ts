/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IScrollable } from 'vs/base/common/scrollable';
import Event, { Emitter } from 'vs/base/common/event';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { Gesture } from 'vs/base/browser/touch';
import * as DOM from 'vs/base/browser/dom';
import { IScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollableElement } from 'vs/base/browser/ui/scrollbar/impl/scrollableElement';
import { RangeMap } from './rangeMap';

export interface IScrollEvent {
	vertical: boolean;
	horizontal: boolean;
}

export interface IListDelegate<T> {
	getHeight(element: T): number;
	getTemplateId(element: T): string;
}

export interface IRenderer<TElement, TTemplateData> {
	templateId: string;
	renderTemplate(container: HTMLElement): TTemplateData;
	renderElement(element: TElement, templateData: TTemplateData): void;
	disposeTemplate(templateData: TTemplateData): void;
}

interface IItem {
	domNode: HTMLElement;
}

export class List<T> implements IScrollable {

	private items: IItem[];
	private rangeMap: RangeMap;
	private _scrollTop: number;
	private _viewHeight: number;
	private renderTop: number;
	private renderHeight: number;

	private domNode: HTMLElement;
	private wrapper: HTMLElement;
	private gesture: Gesture;
	private rowsContainer: HTMLElement;
	private scrollableElement: IScrollableElement;

	private _onScroll = new Emitter<IScrollEvent>();
	onScroll: Event<IScrollEvent> = this._onScroll.event;

	constructor(container: HTMLElement, delegate: IListDelegate<T>, renderers: IRenderer<T, any>) {
		this.items = [];
		this.rangeMap = new RangeMap();

		this.domNode = document.createElement('div');
		this.domNode.className = 'monaco-list';
		this.domNode.tabIndex = 0;

		this.wrapper = document.createElement('div');
		this.wrapper.className = 'monaco-list-wrapper';
		this.scrollableElement = new ScrollableElement(this.wrapper, {
			forbidTranslate3dUse: true,
			scrollable: this,
			horizontal: 'hidden',
			vertical: 'auto',
			useShadows: true,
			saveLastScrollTimeOnClassName: 'monaco-list-row'
		});

		this.gesture = new Gesture(this.wrapper);

		this.rowsContainer = document.createElement('div');
		this.rowsContainer.className = 'monaco-list-rows';
	}

	layout(height?: number): void {
		// if (!this.isTreeVisible()) {
		// 	return;
		// }

		this.viewHeight = height || DOM.getContentHeight(this.wrapper); // render
		this.setScrollTop(this.scrollTop); // render

		this.scrollableElement.onElementDimensions();
		this.scrollableElement.onElementInternalDimensions();
	}

	// IScrollable

	getScrollHeight(): number {
		return this.rangeMap.size;
	}

	getScrollWidth(): number {
		return 0;
	}

	getScrollLeft(): number {
		return 0;
	}

	setScrollLeft(scrollLeft: number): void {
		// noop
	}

	getScrollTop(): number {
		return this.scrollTop;
	}

	setScrollTop(scrollTop: number): void {
		scrollTop = Math.min(scrollTop, this.getScrollHeight() - this.viewHeight);
		scrollTop = Math.max(scrollTop, 0);

		this.render(scrollTop, this.viewHeight);
		this._scrollTop = scrollTop;

		this._onScroll.fire({ vertical: true, horizontal: false });
	}

	addScrollListener(callback: ()=>void): IDisposable {
		return this.onScroll(callback);
	}

	// Render Properties

	private get viewHeight() {
		return this._viewHeight;
	}

	private  set viewHeight(viewHeight: number) {
		this.render(this.scrollTop, viewHeight);
		this._viewHeight = viewHeight;
	}

	private get scrollTop(): number {
		return this._scrollTop;
	}

	private set scrollTop(scrollTop: number) {
		this.setScrollTop(scrollTop);
	}

	// Render

	private render(scrollTop: number, viewHeight: number): void {
		const renderTop = Math.max(scrollTop, 0);
		const renderBottom = scrollTop + viewHeight;
		const thisRenderBottom = this.scrollTop + this.viewHeight;
		let i: number, stop: number;

		// when view scrolls down, start rendering from the renderBottom
		for (i = this.indexAfter(renderBottom) - 1, stop = this.rangeMap.indexAt(Math.max(thisRenderBottom, renderTop)); i >= stop; i--) {
			this.insertInDOM(i);
		}

		// when view scrolls up, start rendering from either this.renderTop or renderBottom
		for (i = Math.min(this.rangeMap.indexAt(this.renderTop), this.indexAfter(renderBottom)) - 1, stop = this.rangeMap.indexAt(renderTop); i >= stop; i--) {
			this.insertInDOM(i);
		}

		// when view scrolls down, start unrendering from renderTop
		for (i = this.rangeMap.indexAt(this.renderTop), stop = Math.min(this.rangeMap.indexAt(renderTop), this.indexAfter(thisRenderBottom)); i < stop; i++) {
			this.removeFromDOM(i);
		}

		// when view scrolls up, start unrendering from either renderBottom this.renderTop
		for (i = Math.max(this.indexAfter(renderBottom), this.rangeMap.indexAt(this.renderTop)), stop = this.indexAfter(thisRenderBottom); i < stop; i++) {
			this.removeFromDOM(i);
		}

		const topPosition = this.rangeMap.positionAt(this.rangeMap.indexAt(renderTop));

		if (topPosition > -1) {
			this.rowsContainer.style.top = (topPosition - renderTop) + 'px';
		}

		this.renderTop = renderTop;
		this.renderHeight = renderBottom - renderTop;
	}

	private indexAfter(position: number): number {
		return Math.min(this.rangeMap.indexAt(position) + 1, this.rangeMap.size);
	}

	private insertInDOM(index: number): void {
		// TODO
	}

	private removeFromDOM(index: number): void {
		// TODO
	}

	dispose() {
		this.items = null;

		if (this.domNode && this.domNode.parentElement) {
			this.domNode.parentNode.removeChild(this.domNode);
			this.domNode = null;
		}

		this.rangeMap = dispose(this.rangeMap);
		this.gesture = dispose(this.gesture);
		this.scrollableElement = dispose(this.scrollableElement);
		this._onScroll = dispose(this._onScroll);
	}
}
