import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        // Modify texture coordinates for Requirement 2
        //console.log(this.shapes.box_2.arrays.texture_coord);
        this.shapes.box_2.arrays.texture_coord.forEach(p => p.scale_by(2));

        this.box_1_theta = 0;
        this.box_2_theta = 0;
        this.spin = false;

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            texture: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/stars.png")
            }),

            fruit: new Material(new Texture_Rotate(), {
                color: hex_color("#000000"),
                ambient: 1.0,
                texture: new Texture("assets/fruit.jpg", "NEAREST"),
            }),
            giraffe: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1.0,
                texture: new Texture("assets/giraffe.jpg", "LINEAR_MIPMAP_LINEAR"),
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Cube rotation", ["c"], () => this.spin = !this.spin);
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        // Reset animation time so the value doesn't grow indefinitely
        program_state.animation_time = program_state.animation_time % 4000;

        const box_1_rpm = 20;
        const box_2_rpm = 30;

        if (this.spin) {
            this.box_1_theta += box_1_rpm * dt * 2 * Math.PI / 60;
            this.box_2_theta += box_2_rpm * dt * 2 * Math.PI / 60;
        }

        let model_transform = Mat4.identity();
        
        const box_1_transform = Mat4.translation(-2, 0, 0)
            .times(Mat4.rotation(this.box_1_theta, 1, 0, 0))
            .times(model_transform);
            this.shapes.box_1.draw(context, program_state, box_1_transform, this.materials.fruit);
            
        const box_2_transform = Mat4.translation(2, 0, 0)
            .times(Mat4.rotation(this.box_2_theta, 0, 1, 0))
            .times(model_transform);
        this.shapes.box_2.draw(context, program_state, box_2_transform, this.materials.giraffe);

        //this.shapes.axis.draw(context, program_state, model_transform, this.materials.phong.override({color: hex_color("#ffff00")}));
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 final_coord = f_tex_coord + vec2(-2.0 * animation_time, 0.0);
                vec4 tex_color = texture2D( texture, final_coord );

                vec2 final_coord_mod = mod(final_coord, 1.0);
                if ( (final_coord_mod.x > 0.15 && final_coord_mod.x < 0.85 && final_coord_mod.y > 0.15 && final_coord_mod.y < 0.85) &&
                    !(final_coord_mod.x > 0.25 && final_coord_mod.x < 0.75 && final_coord_mod.y > 0.25 && final_coord_mod.y < 0.75) )
                    tex_color = vec4(0.0, 0.0, 0.0, 1.0);
                
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                float theta = animation_time * 2.0 * 3.14159265 / 4.0;
                vec2 final_coord = mat2(cos(theta), -sin(theta), sin(theta), cos(theta)) * (f_tex_coord + vec2(-0.5, -0.5)) + vec2(0.5, 0.5);
                vec4 tex_color = texture2D( texture, final_coord );

                if ( (final_coord.x > 0.15 && final_coord.x < 0.85 && final_coord.y > 0.15 && final_coord.y < 0.85) &&
                    !(final_coord.x > 0.25 && final_coord.x < 0.75 && final_coord.y > 0.25 && final_coord.y < 0.75) )
                    tex_color = vec4(0.0, 0.0, 0.0, 1.0);

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

