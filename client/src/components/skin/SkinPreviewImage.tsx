export default function SkinPreviewImage(props: { src: string; alt: string }) {
    return (
        <img
            src={props.src}
            alt={props.alt}
            style={{
                display: "block",
                margin: "10px auto 10px auto",
                maxWidth: "100%",
                height: "auto",
            }}
        />
    );
}
