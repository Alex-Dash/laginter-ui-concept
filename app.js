const e_text = document.getElementById("textfill");
const f_text = e_text.innerText;
const target = document.getElementById('movebox');
const area = document.getElementById('playarea');
const title = document.getElementById('boxtitle');

var tgt_pos = [Number(window.getComputedStyle(target).left.replaceAll("px","")), Number(window.getComputedStyle(target).top.replaceAll("px",""))]
var tgt_dims = [Number(window.getComputedStyle(target).width.replaceAll("px","")), Number(window.getComputedStyle(target).height.replaceAll("px",""))]
var mouse_flag = false;
var mouse_ref = [0, 0];

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
        [0, 1],
        [0.23, 1],
        [0.33, 0.5],
        [0.5, 0.2],
        [0.6, 0.7],
        [0.75, 1],
        [1, 1],
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

document.addEventListener('mousedown', (e)=>{
    mouse_flag = true
    mouse_ref = [e.clientX, e.clientY]
})

document.addEventListener('mouseup', ()=>{
    mouse_flag = false
})

target.addEventListener('mousemove', (e)=>{
    if(!mouse_flag) {
        return
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
    console.log(center_float[0])

    target.style.left = newpos[0]+"px"
    target.style.top = newpos[1]+"px"

    let textfloat = (center_float[0]+center_float[1])/2
    e_text.innerText = f_text.substring(0, f_text.length*laginter(textfloat, known_points.text))

    target.style.backgroundPositionX = laginter(center_float[0], known_points.grad_x)+"px"
    target.style.backgroundPositionY = laginter(center_float[1], known_points.grad_y)+"px"

    //update ref
    mouse_ref = [e.clientX, e.clientY]
    tgt_pos = newpos
})