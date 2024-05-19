const e_text = document.getElementById("textfill");
const f_text = e_text.innerText;
const target = document.getElementById('movebox');
const area = document.getElementById('playarea');
const title = document.getElementById('boxtitle');

const ge = {
    title: {
        e: document.getElementById("g-title"),
        ctx: document.getElementById("g-title").getContext("2d"),
    },
    text: {
        e: document.getElementById("g-text"),
        ctx: document.getElementById("g-text").getContext("2d")
    },
    grad: {
        e: document.getElementById("g-grad"),
        ctx: document.getElementById("g-grad").getContext("2d")
    },
}

var tgt_pos = [Number(window.getComputedStyle(target).left.replaceAll("px","")), Number(window.getComputedStyle(target).top.replaceAll("px",""))]
var tgt_dims = [Number(window.getComputedStyle(target).width.replaceAll("px","")), Number(window.getComputedStyle(target).height.replaceAll("px",""))]
var canvas_size_ref = [Number(window.getComputedStyle(ge.title.e).width.replaceAll("px","")), Number(window.getComputedStyle(ge.title.e).height.replaceAll("px",""))]
var mouse_flag = false;
var mouse_ref = [0, 0];

ge.title.e.setAttribute('width', canvas_size_ref[0])
ge.title.e.setAttribute('height', canvas_size_ref[1])

ge.text.e.setAttribute('width', canvas_size_ref[0])
ge.text.e.setAttribute('height', canvas_size_ref[1])

ge.grad.e.setAttribute('width', canvas_size_ref[0])
ge.grad.e.setAttribute('height', canvas_size_ref[1])

const known_points = {
    title:[
        [0, 360],
        [0.05, 260],
        [0.13, 150],
        [0.3, 50],
        [0.4, 180],
        [0.6, 180],
        [0.75, 0],
        [0.8, 0],
        [1, 0],
    ],
    text:[
        [0, 0],
        [0.23, 0.8],
        [0.5, 0.3],
        [0.75, 0.8],
        [1, 0],
    ],
    grad_x:[
        [0.0, -612],
        [0.35, -870],
        [0.65, -870],
        [1, -1200],
    ],
    grad_y:[
        [0.0, -453],
        [0.35, -660],
        [0.65, -660],
        [1, -860],
    ]
}

// Calculate graph bounds
ge.title.max = Math.max(...known_points.title.map(e=>e[1]))
ge.title.min = Math.min(...known_points.title.map(e=>e[1]))

ge.grad.xmax = Math.max(...known_points.grad_x.map(e=>e[1]))
ge.grad.xmin = Math.min(...known_points.grad_x.map(e=>e[1]))

ge.grad.ymax = Math.max(...known_points.grad_y.map(e=>e[1]))
ge.grad.ymin = Math.min(...known_points.grad_y.map(e=>e[1]))

const g_epsilon = 0.01 

/**
 * Interpolates a given value using Lagrange's Interpolation
 * through a set of pre-defined known points.
 * @param {Number} x - The value to interpolate
 * @param {Array[Array[2]]} [[x1,y1], [x2,y2], ...] - Interpolation points, distinct Xn
 * @param {Number} order - OPTIONAL. Override Lagrange curve order
 * @returns {Number} - Interpolated value f(x)
 */
function laginter(x, points, order) {
    if(x === undefined || points === undefined){
        throw "laginter(): one or more required parameters was not defined";
    }

    if(order === undefined){
        order = points.length-1;
    }

    if(points.length<=order || order<1){
        throw `laginter(): cannot interpolate over ${points.length} with the order of ${order}.`;
    }

    let ret = 0;
    for (let term_id = 0; term_id <= order; term_id++) {
        let nm = 1;
        let dn = 1;
        for (let subpart_id = 0; subpart_id <= order; subpart_id++) {
            if(term_id === subpart_id){
                continue
            }
            nm *= x-points[subpart_id][0];
            dn *= points[term_id][0] - points[subpart_id][0];
        }
        ret+= nm/dn*points[term_id][1];
    }
    return ret
}

/**
 * Returns a clamped verstion of an input vector
 * using supplied min and max values
 * @param {Array} vector - 1D array of vector-values
 * @param {Number} min - Acceptable min
 * @param {Number} max - Acceptable max
 * @returns {Array} new clamped vector
 */
function clampVector(vector, min, max) {
    let nv = [];
    for (const vv of vector) {
        nv.push(
            (vv<=max && vv>=min?vv:(vv>max?max:min))
        )
    }
    return nv
}

function remap(input, from_min, from_max, to_min, to_max, clamp = true) {
    let perc = (input-from_min)/(from_max-from_min)
    if(clamp){
        perc = (perc<0 || perc>1)?(perc<0?0:1):perc
    }
    return (to_max-to_min)*perc+to_min
}

function redrawGraphs(center_float, textfloat, ref_size) {
    ge.title.ctx.fillStyle = 'rgb(34, 34, 34)';
    ge.title.ctx.fillRect(0,0,ref_size[0], ref_size[1]);
    ge.text.ctx.fillStyle = 'rgb(34, 34, 34)';
    ge.text.ctx.fillRect(0,0,ref_size[0], ref_size[1]);
    ge.grad.ctx.fillStyle = 'rgb(34, 34, 34)';
    ge.grad.ctx.fillRect(0,0,ref_size[0], ref_size[1]);

    // title graph
    ge.title.ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
    ge.title.ctx.font = `${ref_size[1]/12}px 'Ubuntu Sans Mono', monospace`;
    let label1 = "Title position interpolation"
    ge.title.ctx.fillText(label1, ref_size[0]/2-(ref_size[1]/12*label1.length/4), ref_size[1]/7);
    ge.title.ctx.strokeStyle = "rgb(200, 200, 200)";
    ge.title.ctx.lineWidth  = 2;
    ge.title.ctx.beginPath();
    ge.title.ctx.moveTo(
        remap(0, 0, 1, 0, ref_size[0]),
        ref_size[1]-remap(known_points.title[0][1], ge.title.min, ge.title.max, 0, ref_size[1])
    );

    for (let step = 0; step < center_float[0]; step+=0.005) {
        ge.title.ctx.lineTo(
            remap(step, 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(laginter(step, known_points.title), ge.title.min, ge.title.max, 0, ref_size[1])
        );
    }
    ge.title.ctx.stroke();

    for (const point of known_points.title) {
        ge.title.ctx.fillStyle = "rgba(200, 60, 200, 0.7)";
        ge.title.ctx.beginPath();
        ge.title.ctx.arc(
            remap(point[0], 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(point[1], ge.title.min, ge.title.max, 0, ref_size[1]),
            8,
            0,
            2 * Math.PI
        );
        ge.title.ctx.fill();
    }

    // text graph
    ge.text.ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
    ge.text.ctx.font = `${ref_size[1]/12}px 'Ubuntu Sans Mono', monospace`;
    let label2 = "Text fill interpolation"
    ge.text.ctx.fillText(label2, ref_size[0]/2-(ref_size[1]/12*label2.length/4), ref_size[1]/7);
    ge.text.ctx.strokeStyle = "rgb(200, 200, 200)";
    ge.text.ctx.lineWidth  = 2;
    ge.text.ctx.beginPath();
    ge.text.ctx.moveTo(
        remap(0, 0, 1, 0, ref_size[0]),
        ref_size[1]-remap(known_points.text[0][1], 0, 1, 0, ref_size[1])
    );

    for (let step = 0; step < textfloat; step+=0.005) {
        ge.text.ctx.lineTo(
            remap(step, 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(laginter(step, known_points.text), 0, 1, 0, ref_size[1])
        );
    }
    ge.text.ctx.stroke();

    for (const point of known_points.text) {
        ge.text.ctx.fillStyle = "rgba(200, 60, 200, 0.7)";
        ge.text.ctx.beginPath();
        ge.text.ctx.arc(
            remap(point[0], 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(point[1], 0, 1, 0, ref_size[1]),
            8,
            0,
            2 * Math.PI
        );
        ge.text.ctx.fill();
    }


    // grad label
    ge.grad.ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
    ge.grad.ctx.font = `${ref_size[1]/16}px 'Ubuntu Sans Mono', monospace`;
    let label3 = "Gradient position interpolation"
    ge.grad.ctx.fillText(label3, ref_size[0]/2-(ref_size[1]/16*label3.length/3.3), ref_size[1]/7);

    // grad graph x
    ge.grad.ctx.strokeStyle = "rgb(200, 60, 60)";
    ge.grad.ctx.lineWidth  = 2;
    ge.grad.ctx.beginPath();
    ge.grad.ctx.moveTo(
        remap(0, 0, 1, 0, ref_size[0]),
        ref_size[1]-remap(known_points.grad_x[0][1], ge.grad.min, ge.grad.max, 0, ref_size[1])
    );

    for (let step = 0; step < center_float[0]; step+=0.005) {
        ge.grad.ctx.lineTo(
            remap(step, 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(laginter(step, known_points.grad_x), ge.grad.xmin, ge.grad.xmax, 0, ref_size[1])
        );
    }
    ge.grad.ctx.stroke();

    for (const point of known_points.grad_x) {
        ge.grad.ctx.fillStyle = "rgba(200, 60, 60, 0.7)";
        ge.grad.ctx.beginPath();
        ge.grad.ctx.arc(
            remap(point[0], 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(point[1], ge.grad.xmin, ge.grad.xmax, 0, ref_size[1]),
            8,
            0,
            2 * Math.PI
        );
        ge.grad.ctx.fill();
    }

    // grad graph y
    ge.grad.ctx.strokeStyle = "rgb(60, 200, 60)";
    ge.grad.ctx.lineWidth  = 2;
    ge.grad.ctx.beginPath();
    ge.grad.ctx.moveTo(
        remap(0, 0, 1, 0, ref_size[0]),
        ref_size[1]-remap(known_points.grad_y[0][1], ge.grad.min, ge.grad.max, 0, ref_size[1])
    );

    for (let step = 0; step < center_float[1]; step+=0.005) {
        ge.grad.ctx.lineTo(
            remap(step, 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(laginter(step, known_points.grad_y), ge.grad.ymin, ge.grad.ymax, 0, ref_size[1])
        );
    }
    ge.grad.ctx.stroke();

    for (const point of known_points.grad_y) {
        ge.grad.ctx.fillStyle = "rgba(60, 200, 60, 0.7)";
        ge.grad.ctx.beginPath();
        ge.grad.ctx.arc(
            remap(point[0], 0, 1, 0, ref_size[0]), 
            ref_size[1]-remap(point[1], ge.grad.ymin, ge.grad.ymax, 0, ref_size[1]),
            8,
            0,
            2 * Math.PI
        );
        ge.grad.ctx.fill();
    }
}

redrawGraphs([0.25, 0.25], 0.25, canvas_size_ref)

const md = (e) => {
    if(e.type.includes("touch")){
        e.clientX = e.touches[0].clientX
        e.clientY = e.touches[0].clientY
    }
    mouse_flag = true
    mouse_ref = [e.clientX, e.clientY]
}

const mu = (e) => {
    mouse_flag = false
}

const mm = (e)=>{
    if(!mouse_flag) {
        return
    }
    e.preventDefault();
    if(e.type.includes("touch")){
        e.clientX = e.touches[0].clientX
        e.clientY = e.touches[0].clientY
    }
    let delta = [e.clientX - mouse_ref[0], e.clientY - mouse_ref[1]]

    // update ui
    let newpos = [tgt_pos[0]+delta[0], tgt_pos[1]+delta[1]]
    let box_center_px = [tgt_dims[0]/2 + newpos[0], tgt_dims[1]/2+newpos[1]]
    let center_float = clampVector([
        box_center_px[0]/area.clientWidth,
        box_center_px[1]/area.clientHeight
    ], 0, 1);
    
    title.style.left = laginter(center_float[0], known_points.title)+"px"

    target.style.left = newpos[0]+"px"
    target.style.top = newpos[1]+"px"

    let textfloat = (center_float[0]+center_float[1])/2
    e_text.innerText = f_text.substring(0, f_text.length*laginter(textfloat, known_points.text))

    target.style.backgroundPositionX = laginter(center_float[0], known_points.grad_x)+"px"
    target.style.backgroundPositionY = laginter(center_float[1], known_points.grad_y)+"px"

    redrawGraphs(center_float, textfloat, canvas_size_ref)
    
    //update ref
    mouse_ref = [e.clientX, e.clientY]
    tgt_pos = newpos

}

document.addEventListener('mousedown', md)
document.addEventListener('mouseup', mu)

document.addEventListener('touchstart', md)

document.addEventListener('touchend', mu)
document.addEventListener('touchcancel', mu)

target.addEventListener('mousemove', mm)
target.addEventListener('touchmove', mm)