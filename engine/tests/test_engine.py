from baccarat_engine.roads import Roads, derived_color
from baccarat_engine.service import snapshot_from_sequence


def test_tie_does_not_open_column():
    roads = Roads()
    roads.push("B")
    roads.push("T")
    roads.push("B")
    assert roads.columns == [["B", "B"]]
    assert roads.ties_on == [[1, 0]]


def test_new_column_on_side_change():
    roads = Roads()
    for item in "BBP":
        roads.push(item)
    assert roads.columns == [["B", "B"], ["P"]]


def test_derived_new_column_same_depth_is_red():
    columns = [["B", "B"], ["P", "P"], ["B"]]
    assert derived_color(columns, 2, 0, 1) == "R"


def test_derived_new_column_diff_depth_is_blue():
    columns = [["B", "B", "B"], ["P"], ["B"]]
    assert derived_color(columns, 2, 0, 1) == "A"


def test_analyze_empty_sits():
    snap = snapshot_from_sequence([])
    assert snap.stats["manos"] == 0
    assert snap.pick in {None, "B"}


def test_chop_detects_1111():
    snap = snapshot_from_sequence(list("BPBP"))
    tags = {p.tag for p in snap.patterns if p.active}
    assert "CHOP" in tags


def test_dragon_detects_six():
    snap = snapshot_from_sequence(list("BBBBBB"))
    tags = {p.tag for p in snap.patterns if p.active}
    assert "DRAGON" in tags
    assert snap.stats["racha"] == 6
