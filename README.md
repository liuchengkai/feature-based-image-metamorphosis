# feature-based-image-metamorphosis
An inplementation of [Feature-based image metamorphosis](https://dl.acm.org/doi/10.1145/142920.134003) using html+js. The demo is available [here](https://6ckai.com/projects/image_morphing/).  
![image](https://raw.githubusercontent.com/liuchengkai/feature-based-image-metamorphosis/master/docs/11.jpg)
![image](https://raw.githubusercontent.com/liuchengkai/feature-based-image-metamorphosis/master/docs/12.jpg)
# Features
* The algorithm is run in a new tread using web worker in order not to block the UI rendering. 
* The demo generates animation from source to target image.
# Todo
* Allow users to edit vectors after creating them.
* Generated images or animation can be downloaded.
# Reference
[[1] Beier T ,  Neely S . Feature-based image metamorphosis[J]. Acm Siggraph Computer Graphics, 1992, 26(2):35-42.](https://dl.acm.org/doi/10.1145/133994.134003)
