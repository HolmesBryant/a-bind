var exampleObject = {
	_foo: 'foo',

	get foo() { return this._foo },

	set foo(value) {
		this._foo = value;
		if (window.abind) abind.update(this, 'foo', value);
	}
}
