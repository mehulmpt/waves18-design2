// constants
const REWIND = 'REWIND'
const FORWARD = 'FORWARD'
const minCap = 1000

const container = document.getElementById('video')
const playerForward = document.getElementById('playerForward')
const playerBackward = document.getElementById('playerBackward')

// preloading
var req1 = new XMLHttpRequest()
var req2 = new XMLHttpRequest()
req1.open('GET', '/dark.webm', true)
req2.open('GET', '/krad.mp4', true)
req1.responseType = 'blob'
req2.responseType = 'blob'

req1.onload = function() {
	// Onload is triggered even on 404
	// so we need to check the status code
	if (this.status === 200) {
	   var videoBlob = this.response
	   var vid = URL.createObjectURL(videoBlob) // IE10+
	   // Video is now downloaded
	   // and we can set it as source on the video element
	   playerForward.src = vid
	}
 }

 req2.onload = function() {
	// Onload is triggered even on 404
	// so we need to check the status code
	if (this.status === 200) {
	   var videoBlob = this.response
	   var vid = URL.createObjectURL(videoBlob) // IE10+
	   // Video is now downloaded
	   // and we can set it as source on the video element
	   playerBackward.src = vid
	   playerBackward.currentTime = vid.duration
	}
 }

req1.send()
req2.send()

// debouncer
function debounce(func, wait, immediate) {
	let timeout
	return function(...args) {
		const later = () => {
			timeout = null
			if (!immediate) func(...args)
		}
		
		const callNow = immediate && !timeout

		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		if (callNow) func(...args)
	}
}

// resetters
let seekTimer
let intervalRewind

// polyfill for negative playback
function rewind(rewindSpeed) {  
	
	console.log('Rewinding with', rewindSpeed)  
	clearInterval(intervalRewind)

	if(rewindSpeed < 0.07) {
		return activePlayer.playbackRate = 0
	}
	
	intervalRewind = setInterval(() => {
		console.log('intv running')
		if(activePlayer.currentTime <= 0) {
			//player.pause()
			activePlayer.playbackRate = 0
			activePlayer.currentTime = 0
			return clearInterval(intervalRewind)
		}
		activePlayer.currentTime -= 0.02 // Math.max(startVideoTime - elapsed*rewindSpeed/1000.0, 0)
	}, 30)
 }


let activePlayer = playerForward
let mainSEEK = FORWARD

playerBackward.onloadeddata = function() {
	playerBackward.playbackRate = 0
	//playerBackward.currentTime = playerBackward.duration
	playerBackward.play()
}

playerForward.onloadeddata = function() {
	playerForward.playbackRate = 0
	playerForward.play()
}

playerForward.onended = function() {
	playerForward.playbackRate = 0
	playerForward.play()
}

playerBackward.onended = function() {
	playerBackward.playbackRate = 0
	playerBackward.play()
}

;[playerForward, playerBackward].forEach(player => {
	player.addEventListener('timeupdate', _ => {
		if(activePlayer == playerForward) {
			const time = playerForward.duration - playerForward.currentTime
			//playerBackward.querySelector('source').setAttribute('src', '/x.mp4#t='+time)
			playerBackward.currentTime = time
			//playerBackward.load()
		} else {
			const time = playerBackward.duration - playerBackward.currentTime
			//playerForward.querySelector('source').setAttribute('src', '/x.mp4#t='+time)
			playerForward.currentTime = time
			//playerForward.load()
		}
	})
})

const videoInfo = {
	_speed: 0,
	get speed() {
		//console.log('Getting speed => ', this._speed)
		return this._speed
	},
	/*get negSpeed() {
		return this._speed
	},*/
	set speed(val) {
		if(val < 0.0625 && val !== 0) val = 0.0625 // because val = 0 is allowed
		if(val > 2.5) val = 2.5 // cap
		this._speed = val
		activePlayer.playbackRate = this._speed
	},
	/*set negSpeed(val) {
		// called by reverse
		if(val < 0.0625 && val !== 0) val = 0.0625 // because val = 0 is allowed
		if(val > 2.5) val = 2.5 // cap
		this._speed = val
		if(val !== 0) {
			// don't need to set infinite setInterval
			rewind(this._speed)
		} else {
			clearInterval(intervalRewind)
		}
	}*/
}

container.addEventListener('wheel', debounce(handleScroll, 15, true), false)

async function handleScroll(e) {
	const delta = e.wheelDeltaY/200
	const seekDirection = delta > 0 ? REWIND : FORWARD

	/*if(mainSEEK === FORWARD && seekDirection === REWIND) {
		console.log(parseFloat(playerBackward.querySelector('source').getAttribute('src').split('#t=')[1]), 'TIME')
		playerBackward.currentTime = parseFloat(playerBackward.querySelector('source').getAttribute('src').split('#t=')[1])
	//	playerForward.load()
		mainSEEK = REWIND
	} else if(mainSEEK === REWIND && seekDirection === FORWARD) {
		playerForward.currentTime = parseFloat(playerForward.querySelector('source').getAttribute('src').split('#t=')[1])
	//	playerBackward.load()
		mainSEEK = FORWARD
	}*/

	if(seekDirection === REWIND) {
		console.log('REWINDING')
		//playerBackward.currentTime = playerForward.duration - playerForward.currentTime
		activePlayer = playerBackward
		document.getElementById('playerBackward').classList.remove('hide')
		document.getElementById('playerForward').classList.add('hide')
	}
	else {
		//playerForward.currentTime = playerBackward.duration - playerBackward.currentTime
		activePlayer = playerForward
		document.getElementById('playerForward').classList.remove('hide')
		document.getElementById('playerBackward').classList.add('hide')
	}

	await activePlayer.play()

	clearTimeout(seekTimer)
	//console.log('Requesting and setting speed')
	
	
	//if(delta < 0) {
		// scrolling forward, +ve playbackrate
		videoInfo.speed += Math.abs(delta)
	//} else {
		// scrolling back but -ve playback not allowed
	//	videoInfo.negSpeed += Math.abs(delta)
	//}
	//console.log('Speed set')

	seekTimer = setTimeout(() => {
		const intv = setInterval(() => {
			//console.log('Requesting speed')
			let deacceleration
			const speed = videoInfo.speed
			
			if(speed > 2) { // too much speed, reduce fast
				deacceleration = 0.1*speed
			} else if(speed > 1.5) {
				deacceleration = 0.07*speed
			} else {
				deacceleration = 0.05*speed
			}
			//videoInfo.speed -= 0.05*videoInfo.speed
			//if(delta < 0) {
			//	console.log('Forward deacc')
				videoInfo.speed = speed - deacceleration
		//	} else {
		//		console.log('Rewind deacc')
		//		rewind(speed - deacceleration)
				videoInfo.negSpeed = speed - deacceleration
		//	}
		//	console.log('Requesting speed 2')
			if(videoInfo.speed < 0.07) {
		//		console.log('Setting speed 2')
				videoInfo.speed = 0
				clearInterval(intv)
			} else {
				//console.log(videoInfo.speed)
			}
		}, 10)
	}, 500)

	//console.log(e.wheelDeltaY)
}