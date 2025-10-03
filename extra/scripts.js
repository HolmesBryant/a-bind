/**
 * Toggles the "sticky" quality of a target element based on scroll position.
 *
 * This function adds an event listener to the window that checks the scroll position.
 * If the vertical scroll position exceeds the offset of a watched element minus the height of the target,
 * it removes the 'sticky' class from the target. Otherwise, it adds the 'sticky' class.
 *
 * @param {HTMLElement} target - The element whose sticky quality needs to be toggled.
 * @param {HTMLElement} watched - The element used to determine when the target should lose its sticky quality.
 */
function unstickIfNeeded (target, watched) {
	window.addEventListener('scroll', () => {
		const offset = watched.offsetTop - target.offsetHeight;
		if (window.scrollY > offset) {
			target.classList.remove('sticky');
		} else {
			target.classList.add('sticky');
		}
	});
}

/*
 * Automatically selects the text in input elements on 'focus' and 'click'
 */
function upgradeInputs () {
	const inputs = document.querySelectorAll('input');
	for (const input of inputs) {
		input.addEventListener('focus', event => {
			event.target.select();
		});

		input.addEventListener('click', event => {
			event.target.select();
		});
	}
}

/**
 * Grab the README file and stick it in the "instructions" container
 */
function getReadme () {
	const elem = document.querySelector('#instructions');
	if (!elem) return;
	fetch ('./README.md')
	.then (response => response.text())
	.then (text => {
		elem.textContent = text;
	});
}

// const target = document.querySelector('#stick');
// const watched = document.querySelector('#watched');
// unstickIfNeeded(target, watched);
upgradeInputs();
getReadme();

