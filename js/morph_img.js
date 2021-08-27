let progress_in_total = 0
let generated_images = []

class Vector{
    constructor(x, y){
        this.x = x
        this.y = y
    }
    add(v){
        return new Vector(this.x + v.x, this.y + v.y)
    }
    dot(v){
        return this.x*v.x + this.y*v.y
    }
    scale(s){
        return new Vector(this.x * s, this.y * s)
    }
}
//防止imagedata浅层拷贝
//https://www.deanhan.cn/copy-imagedata.html
function copyImageData(imagedata){
    return new ImageData(new Uint8ClampedArray(imagedata.data),imagedata.width,imagedata.height);
}
//从二维的画布到一维的imagedata索引
function point2index(x, y, width, height){
    return y * width * 4 + x * 4
}
//*************************************数学运算
//计算两点距离
function cal_distance(pointA, pointB){
    return Math.sqrt(Math.pow((pointB.x - pointA.x), 2) + Math.pow((pointB.y - pointA.y), 2))
}
//计算两点距离平方
function cal_distance_pow(pointA, pointB){
    return Math.pow((pointB.x - pointA.x), 2) + Math.pow((pointB.y - pointA.y), 2)
}
//给定两点计算向量
function cal_vector(pointA, pointB){
    return new Vector(pointB.x - pointA.x , pointB.y - pointA.y)
}
//计算点到向量的最短距离
function cal_distance_from_point_to_vector(point, vectorPointA, vectorPointB){
    return Math.sqrt(cal_distance_pow(point, vectorPointA).toFixed(2) - Math.pow(cal_vector(vectorPointA, vectorPointB).dot(cal_vector(vectorPointA, point))/cal_distance(vectorPointA, vectorPointB), 2).toFixed(2))
}
//***************************************
//核心算法
// dest_size {width, height}
function warp_image(output_img, original_image, warp_lines, original_lines, params){
    let dest_size = {
        width: output_img.width,
        height: output_img.height
    }
    //临时图像
    let temp_image_data = copyImageData(output_img)
    for (let py = 0; py < dest_size.height; py++) //遍历临时图像的每个像素
    {
        for(let px = 0; px < dest_size.width; px++){
            //特征线点的点与源图像计算出的点的位置的偏移量总和
            let D_sum = new Vector(0, 0)
            weight_sum = 0
            let current_pixel = new Vector(px, py)
            for(let li = 0; li<warp_lines.length; li++){
                //计算当前像素在line上对应的u, v坐标
                let u = cal_vector(warp_lines[li].start, current_pixel).dot(cal_vector(warp_lines[li].start, warp_lines[li].end))/cal_distance_pow(warp_lines[li].start, warp_lines[li].end)
                //计算垂直于line向量的向量
                let temp = cal_vector(warp_lines[li].start, warp_lines[li].end)
                let line_vector_vertical = new Vector(temp.y, -temp.x)
                let v = cal_vector(warp_lines[li].start, current_pixel).dot(line_vector_vertical) / cal_distance(line_vector_vertical, {x: 0, y: 0})
                let original_line_vector = cal_vector(original_lines[li].start, original_lines[li].end)
                let original_line_vector_vertical = new Vector(original_line_vector.y, -original_line_vector.x)
                original_lines[li].start = new Vector(original_lines[li].start.x, original_lines[li].start.y)
                let x_prime = 
                    original_lines[li].start.add(
                        original_line_vector.scale(u)
                        .add(original_line_vector_vertical.scale(v / cal_distance(new Vector(0, 0), original_line_vector_vertical)))
                    )
                //防止越界
                x_prime.x = x_prime.x > original_image.width - 1 ? original_image.width - 1 : x_prime.x
                x_prime.y = x_prime.y > original_image.height - 1 ? original_image.height - 1 : x_prime.y
                x_prime.x = x_prime.x < 0 ? 0 : x_prime.x
                x_prime.y = x_prime.y < 0 ? 0 : x_prime.y
                //计算该线段引起的偏移量
                let D = cal_vector(current_pixel, x_prime)
                //计算current_pixel到该线段的距离
                //线段长度
                let dis = cal_distance_from_point_to_vector(current_pixel, warp_lines[li].start, warp_lines[li].end)
                //计算weight
                let weight = Math.pow(
                    Math.pow(
                    cal_distance(warp_lines[li].start, warp_lines[li].end),
                    params.c
                    ) / params.a + dis,
                    params.b
                )
                D_sum = D_sum.add(D.scale(weight))
                weight_sum += weight
            }
            
            let pixel_from_original_pos = current_pixel.add(D_sum.scale(1/weight_sum))
            pixel_from_original_pos.x = Math.round(pixel_from_original_pos.x)
            pixel_from_original_pos.y = Math.round(pixel_from_original_pos.y)
            //imagedata是一维数组，需要从二维的位置转到一维的位置，imagedata以以下格式存储：
            // r, g, b, a, r, g, b ,a ...
            let pixel_pos = dest_size.width * py * 4 + px * 4
            if(pixel_from_original_pos.x > original_image.width - 1 || pixel_from_original_pos.y > original_image.height - 1){
                //图像越界取白色
                temp_image_data.data[pixel_pos] = 255
                temp_image_data.data[pixel_pos+1] = 255
                temp_image_data.data[pixel_pos+2] = 255
                temp_image_data.data[pixel_pos+3] = 255
            }else{
                let original_index = point2index(pixel_from_original_pos.x, pixel_from_original_pos.y, original_image.width, original_image.height)
                temp_image_data.data[pixel_pos] = original_image.data[original_index]
                temp_image_data.data[pixel_pos+1] = original_image.data[original_index + 1]
                temp_image_data.data[pixel_pos+2] = original_image.data[original_index + 2]
                temp_image_data.data[pixel_pos+3] = original_image.data[original_index + 3]
            }
        }

    }
    return temp_image_data
}

//计算中间图像
function generate_images(data){
    let generate_num = data.generate_num
    let source_lines = data.source_lines
    let target_lines = data.target_lines
    let output_img = data.output_img
    let source_img = data.source_img
    let target_img = data.target_img
    let num_img_processed = 0
    let params = data.params
    for(let i = 0; i < generate_num; i++){
        //第一张图像为源图像，最后一张图像为目标图像
        if(i==0){
            generated_images.push(source_img)
            continue
        }
        if(i==generate_num - 1){
            generated_images.push(target_img)
            break
        }
        //计算中间图像
        //计算线段插值（顶点插值）
        let p = i/(generate_num - 1).toFixed(2)
        let warp_lines = []
        self.postMessage(source_lines.length)
        for(let li=0; li<source_lines.length; li++){
            let warp_line = {
                start: {
                    x: (1 - p) * source_lines[li].start.x + p * target_lines[li].start.x,
                    y: (1 - p) * source_lines[li].start.y + p * target_lines[li].start.y
                },
                end: {
                    x: (1 - p) * source_lines[li].end.x + p * target_lines[li].end.x,
                    y: (1 - p) * source_lines[li].end.y + p * target_lines[li].end.y
                }
            }
            warp_lines.push(warp_line)
        }
        //该变量用于存储混合后的图像
        let result_img = copyImageData(output_img)
        //计算源图像的变形
        let source_warp_img = warp_image(output_img, source_img, warp_lines, source_lines, params)
        //计算目标图像的变形
        let target_warp_img = warp_image(output_img, target_img, warp_lines, target_lines, params)
        //混合
        for(let img_i = 0; img_i + 3 < result_img.data.length; img_i=img_i+4){
            result_img.data[img_i] = (1-p)*source_warp_img.data[img_i] + p*target_warp_img.data[img_i]
            result_img.data[img_i+1] = (1-p)*source_warp_img.data[img_i+1] + p*target_warp_img.data[img_i+1]
            result_img.data[img_i+2] = (1-p)*source_warp_img.data[img_i+2] + p*target_warp_img.data[img_i+2]
            result_img.data[img_i+3] = 255
        }
        generated_images.push(result_img)
        //像父线程发送进度
        num_img_processed ++
        progress_in_total = num_img_processed / (generate_num - 2 )* 100
        self.postMessage({"code": "progress_in_total", "message": Math.round(progress_in_total)})
    }
    self.postMessage({"code": "completed", "message": generated_images})
    self.close()
}

self.addEventListener('message', function (e) {
    if(e.data.code == "process"){
        self.postMessage({"code":"ready", "message": "开始处理"})
        generate_images(e.data.message)
    }
}, false);