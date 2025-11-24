declare module 'three-spritetext' {
    import { Object3D, Vector3 } from 'three';
    export default class SpriteText extends Object3D {
        constructor(text?: string, textHeight?: number, color?: string);
        text: string;
        textHeight: number;
        color: string;
        backgroundColor: string;
        padding: number;
        borderWidth: number;
        borderColor: string;
        borderRadius: number;
        fontFace: string;
        fontSize: number;
        fontWeight: string;
        strokeWidth: number;
        strokeColor: string;
        // Object3D properties that might be accessed directly
        position: Vector3;
    }
}
