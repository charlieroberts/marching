const Audio = {
  __hasInput: false,
  ctx: null,

  start() {
    if( Audio.__hasInput === false ) {
      Audio.ctx = new AudioContext()
      Audio.createInput().then( input => {
        Audio.createFFT()
        input.connect( Audio.FFT )

        Audio.interval = setInterval( Audio.fftCallback, 1000/60 )
        window.FFT = Audio.FFT
      })
    }
    Audio.__hasInput = true
  },

  createInput() {
    console.log( 'connecting audio input...' )
    
    const p = new Promise( resolve => {
      console.log( 'start?' )
      navigator.mediaDevices.getUserMedia({ audio:true, video:false })
        .then( stream => {
          console.log( 'audio input connected' )
          Audio.input = Audio.ctx.createMediaStreamSource( stream )
          //Audio.mediaStreamSource.connect( Gibberish.node )
          Audio.__hasInput = true
          resolve( Audio.input )
        })
        .catch( err => { 
          console.log( 'error opening audio input:', err )
        })
    })
    return p
  },

  createFFT() {
    Audio.FFT = Audio.ctx.createAnalyser()
    Audio.windowSize = 512 
    Audio.FFT.fftSize = Audio.windowSize
    Audio.FFT.values = new Uint8Array( Audio.FFT.frequencyBinCount )
  },

  fftCallback() {
    Audio.FFT.getByteFrequencyData( Audio.FFT.values )
    
    let lowSum, midSum, highSum, lowCount, midCount, highCount
    lowSum = midSum = highSum = lowCount = midCount = highCount = 0

    let frequencyCounter = 0

    // does this start at 0Hz? ack... can't remember... does it include DC offset?
    const hzPerBin = (Audio.ctx.sampleRate / 2) / Audio.windowSize
    const lowRange = 150, midRange = 1400, highRange = Audio.ctx.sampleRate / 2

    for( let i = 1; i < Audio.FFT.frequencyBinCount; i++ ) {
      if( frequencyCounter < lowRange ) {
        lowSum += Audio.FFT.values[ i ]
        lowCount++
      }else if( frequencyCounter < midRange ) {
        midSum += Audio.FFT.values[ i ]
        midCount++
      }else{
        highSum += Audio.FFT.values[ i ]
        highCount++
      }

      frequencyCounter += hzPerBin
    }

    Audio.FFT.low = (lowSum / lowCount) / 255
    Audio.FFT.mid = (midSum / midCount) / 255
    Audio.FFT.high = (highSum / highCount) / 255
  }
}

module.exports = Audio
