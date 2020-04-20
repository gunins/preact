import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import {
	setupScratch,
	teardown,
	serializeHtml,
	sortAttributes
} from '../_util/helpers';

/** @jsx createElement */

describe('replaceNode parameter in render()', () => {
	let scratch, rerender;

	function appendChildToScratch(id) {
		const child = document.createElement('div');
		child.id = id;
		scratch.appendChild(child);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		['a', 'b', 'c'].forEach(id => appendChildToScratch(id));
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should use replaceNode as render root and not inject into it', () => {
		const childA = scratch.querySelector('#a');
		render(<div id="a">contents</div>, scratch, childA);
		expect(scratch.querySelector('#a')).to.equalNode(childA);
		expect(childA.innerHTML).to.equal('contents');
	});

	it('should not remove siblings of replaceNode', () => {
		const childA = scratch.querySelector('#a');
		render(<div id="a" />, scratch, childA);
		expect(scratch.innerHTML).to.equal(
			'<div id="a"></div><div id="b"></div><div id="c"></div>'
		);
	});

	it('should notice prop changes on replaceNode', () => {
		const childA = scratch.querySelector('#a');
		render(<div id="a" className="b" />, scratch, childA);
		expect(sortAttributes(String(scratch.innerHTML))).to.equal(
			sortAttributes(
				'<div id="a" class="b"></div><div id="b"></div><div id="c"></div>'
			)
		);
	});

	it('should unmount existing components', () => {
		const newScratch = setupScratch();
		const unmount = sinon.spy();
		const mount = sinon.spy();
		class App extends Component {
			componentDidMount() {
				mount();
			}

			componentWillUnmount() {
				unmount();
			}

			render() {
				return <div>App</div>;
			}
		}
		render(
			<div id="a">
				<App />
			</div>,
			newScratch
		);
		expect(newScratch.innerHTML).to.equal('<div id="a"><div>App</div></div>');
		expect(mount).to.be.calledOnce;
		render(<div id="a">new</div>, newScratch, newScratch.querySelector('#a'));
		expect(newScratch.innerHTML).to.equal('<div id="a">new</div>');
		expect(unmount).to.be.calledOnce;

		newScratch.parentNode.removeChild(newScratch);
	});

	it('should unmount existing components in prerendered HTML', () => {
		const newScratch = setupScratch();
		const unmount = sinon.spy();
		const mount = sinon.spy();
		class App extends Component {
			componentDidMount() {
				mount();
			}

			componentWillUnmount() {
				unmount();
			}

			render() {
				return <span>App</span>;
			}
		}

		newScratch.innerHTML = `<div id="child"></div>`;

		const childContainer = newScratch.querySelector('#child');

		render(<App />, childContainer);
		expect(serializeHtml(childContainer)).to.equal('<span>App</span>');
		expect(mount).to.be.calledOnce;

		render(<div />, newScratch, newScratch.firstElementChild);
		expect(serializeHtml(newScratch)).to.equal('<div id=""></div>');
		expect(unmount).to.be.calledOnce;

		newScratch.parentNode.removeChild(newScratch);
	});

	it('should render multiple render roots in one parentDom', () => {
		const childA = scratch.querySelector('#a');
		const childB = scratch.querySelector('#b');
		const childC = scratch.querySelector('#c');

		const expectedA = '<div id="a">childA</div>';
		const expectedB = '<div id="b">childB</div>';
		const expectedC = '<div id="c">childC</div>';

		render(<div id="a">childA</div>, scratch, childA);
		render(<div id="b">childB</div>, scratch, childB);
		render(<div id="c">childC</div>, scratch, childC);

		expect(scratch.innerHTML).to.equal(`${expectedA}${expectedB}${expectedC}`);
	});

	it('should call unmount when working with replaceNode', () => {
		const mountSpy = sinon.spy();
		const unmountSpy = sinon.spy();
		class MyComponent extends Component {
			componentDidMount() {
				mountSpy();
			}
			componentWillUnmount() {
				unmountSpy();
			}
			render() {
				return <div>My Component</div>;
			}
		}

		const container = document.createElement('div');
		scratch.appendChild(container);

		render(<MyComponent />, scratch, container);
		expect(mountSpy).to.be.calledOnce;

		render(<div>Not my component</div>, document.body, container);
		expect(unmountSpy).to.be.calledOnce;
	});

	it('should double replace', () => {
		const container = document.createElement('div');
		scratch.appendChild(container);

		render(<div>Hello</div>, scratch, scratch.firstElementChild);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<div>Hello</div>, scratch, scratch.firstElementChild);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should replaceNode after rendering', () => {
		function App({ i }) {
			return <p>{i}</p>;
		}

		render(<App i={2} />, scratch);
		expect(scratch.innerHTML).to.equal('<p>2</p>');

		render(<App i={3} />, scratch, scratch.firstChild);
		expect(scratch.innerHTML).to.equal('<p>3</p>');
	});

	it("shouldn't remove elements on subsequent renders with replaceNode", () => {
		const placeholder = document.createElement('div');
		scratch.appendChild(placeholder);
		const App = () => (
			<div>
				New content
				<button>Update</button>
			</div>
		);

		render(<App />, scratch, placeholder);
		expect(scratch.innerHTML).to.equal(
			'<div>New content<button>Update</button></div>'
		);

		render(<App />, scratch, placeholder);
		expect(scratch.innerHTML).to.equal(
			'<div>New content<button>Update</button></div>'
		);
	});

	it('should remove redundant elements on subsequent renders with replaceNode', () => {
		const placeholder = document.createElement('div');
		scratch.appendChild(placeholder);
		const App = () => (
			<div>
				New content
				<button>Update</button>
			</div>
		);

		render(<App />, scratch, placeholder);
		expect(scratch.innerHTML).to.equal(
			'<div>New content<button>Update</button></div>'
		);

		placeholder.appendChild(document.createElement('span'));
		expect(scratch.innerHTML).to.equal(
			'<div>New content<button>Update</button><span></span></div>'
		);

		render(<App />, scratch, placeholder);
		expect(scratch.innerHTML).to.equal(
			'<div>New content<button>Update</button></div>'
		);
	});
});
