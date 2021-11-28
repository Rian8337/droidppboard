import "../../styles/modules/components/whitelist/WhitelistBeatmapFilter.module.css";

export default function WhitelistBeatmapFilter() {
    return (
        <div>
            <h3 className="beatmap-filter-title">Filtering Beatmaps</h3>
            <table className="beatmap-filter">
                <tbody>
                    <tr>
                        <th>Filter Options</th>
                        <td>CS, AR, OD, HP, SR, BPM</td>
                    </tr>
                    <tr>
                        <th>Sorting Options</th>
                        <td>
                            <p>CS, AR, OD, HP, SR, BPM, mapid, mapname</p>
                            <p>
                                By default, sorting is ascending. You can put
                                &quot;-&quot; in front of a sorting option to
                                use descend sort.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th>Equality Symbols</th>
                        <td>
                            <ul>
                                <li>{"<= (less than or equal to)"}</li>
                                <li>{"< (less than)"}</li>
                                <li>{"> (more than)"}</li>
                                <li>{">= (more than or equal to)"}</li>
                                <li>{"= (equal to)"}</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <th>Behavior</th>
                        <td>
                            <ul>
                                <li>
                                    By default, there is no filter, and the sort
                                    option is set to beatmap name.
                                </li>
                                <li>
                                    Using SR and/or BPM sort option will
                                    override beatmap name sort option.
                                </li>
                                <li>
                                    Anything that doesn&apos;t fall into any of
                                    the filter or sort option will be treated as
                                    searching beatmap name.
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <th>Examples</th>
                        <td>
                            <ul>
                                <li>
                                    <strong>{"cs>=4.2 cs<=5 sort=cs"}</strong>
                                    <p>
                                        will search for beatmaps with CS between
                                        4.2 (inclusive) and 5 (inclusive) and
                                        sort the search results by CS
                                        ascendingly
                                    </p>
                                </li>
                                <li>
                                    <strong>
                                        {"od>=5 od<9 ar>7 ar<=9.7 sort=-ar"}
                                    </strong>
                                    <p>
                                        will search for beatmaps with AR between
                                        7 (exclusive) and 9.7 (inclusive) and OD
                                        between 5 (inclusive) and 9 (exclusive),
                                        and sort the search results by AR
                                        descendingly
                                    </p>
                                </li>
                                <li>
                                    <strong>{"od>=7 bpm>=180"}</strong>
                                    <p>
                                        will search for beatmaps with OD above 7
                                        (inclusive) and BPM above 180
                                        (inclusive) and sort the search results
                                        by BPM ascendingly
                                    </p>
                                </li>
                                <li>
                                    <strong>
                                        {
                                            "cs>=4.2 ar>9.3 od>=8 hp>=5 sort=-sr logic boi is the best"
                                        }
                                    </strong>
                                    <p>
                                        will search for beatmaps with CS above
                                        4.2 (inclusive), AR above 9.3
                                        (exclusive), OD above 8 (inclusive), HP
                                        above 5 (inclusive), and matches the
                                        keyword &quot;logic boi is the
                                        best&quot; (much like osu! search
                                        function), and sort the search results
                                        by star rating descendingly
                                    </p>
                                </li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
