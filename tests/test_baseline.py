from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class BaselineTests(unittest.TestCase):
    def test_model_exists(self):
        p = ROOT / 'assets/blob.glb'
        self.assertGreater(p.stat().st_size, 100_000)
        self.assertEqual(p.read_bytes()[:4], b'glTF')

    def test_approved_defaults(self):
        html = (ROOT / 'index.html').read_text()
        approved = {
            'speed': '2.00', 'length': '2.50', 'lift': '0.22',
            'stance': '0.62', 'heel': '23', 'toe': '28',
            'hip': '0.10', 'bob': '0.010', 'flop': '12',
            'curiosity': '1.00', 'turn': '12',
        }
        for key, value in approved.items():
            with self.subTest(control=key):
                m = re.search(r'<input id="'+key+r'"[^>]*value="([^"]+)"', html)
                self.assertIsNotNone(m, f'missing slider {key}')
                self.assertEqual(m.group(1), value)

    def test_slider_ranges_match_archive(self):
        def sliders(path):
            html = path.read_text()
            return [dict(re.findall(r'(id|min|max|step|value)="([^" ]+)"', tag))
                    for tag in re.findall(r'<input[^>]*type="range"[^>]*>', html)]
        self.assertEqual(sliders(ROOT / 'index.html'),
                         sliders(ROOT / 'reference/approved-standalone.html'))

    def test_critical_mesh_guards(self):
        character = (ROOT / 'src/BlobCharacter.js').read_text()
        self.assertIn('mesh.frustumCulled=false', character)
        self.assertIn('mesh.geometry.clone()', character)
        gaze = (ROOT / 'src/EyeAnimator.js').read_text()
        self.assertIn('dt*25.0', gaze)

if __name__ == '__main__':
    unittest.main()
