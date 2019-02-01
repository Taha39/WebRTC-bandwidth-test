This will stream camera using webRTC.

In this, Video Camera stream is first taken on Canvas.
From Canvas context, new image is created which includes context image with extra height.
Red color is filled on extra height of new image. 
This new image is renderd on Canvas1 with it's context named context1.
Then Canvas1 stream is passed to remote peer using webRTC.

