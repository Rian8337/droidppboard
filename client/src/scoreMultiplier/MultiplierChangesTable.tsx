import { multiplierChanges } from "./multiplierChanges";
import styles from "./MultiplierChangesTable.module.css";

/** The previous and the new multiplier of each mod that changed. */
export function MultiplierChangesTable() {
    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">Mod</th>
                        <th scope="col">Old multiplier</th>
                        <th scope="col">New multiplier</th>
                    </tr>
                </thead>
                <tbody>
                    {multiplierChanges.map(({ mod, previous, next }) => (
                        <tr key={mod}>
                            <th scope="row">{mod}</th>
                            {next === null ? (
                                <td colSpan={2} className={styles.shared}>
                                    {previous}
                                </td>
                            ) : (
                                <>
                                    <td>{previous}</td>
                                    <td>{next}</td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
