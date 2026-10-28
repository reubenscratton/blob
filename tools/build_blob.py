"""Build an editable, component-based GLB of Blob (Starquake-inspired).
Requires numpy, trimesh, scipy and scikit-image. Units are arbitrary.
Front is -Y; Z is up. Face pitch is a positive 30 degrees.
"""
import numpy as np, trimesh
from trimesh.visual import TextureVisuals
from trimesh.visual.material import PBRMaterial
from skimage.measure import marching_cubes
from scipy.interpolate import PchipInterpolator
from pathlib import Path

OUT=Path(__file__).resolve().parents[1] / 'assets' / 'blob.glb'
CHROME=PBRMaterial(name='Glossy porcelain white body',baseColorFactor=[255,255,255,255],roughnessFactor=.15,metallicFactor=0.0)
EYE_WHITE=PBRMaterial(name='Matte white eyes',baseColorFactor=[255,255,255,255],roughnessFactor=.95,metallicFactor=0.0)
BLACK=PBRMaterial(name='Solid matte black mask',baseColorFactor=[0,0,0,255],roughnessFactor=1.0,metallicFactor=0.0)
PUPIL=PBRMaterial(name='Solid matte black pupils',baseColorFactor=[0,0,0,255],roughnessFactor=1.0,metallicFactor=0.0)
CENTRE=np.array([0.,0.,1.15]); R=1.0
PITCH=np.deg2rad(30)
forward=np.array([0.,-np.cos(PITCH),np.sin(PITCH)])
right=np.array([1.,0.,0.]); up=np.array([0.,np.sin(PITCH),np.cos(PITCH)])
parts={}

def add(name, mesh, material):
    mesh.visual=TextureVisuals(material=material)
    parts[name]=mesh

def sphere(name, centre, radius, mat, subdivisions=4):
    m=trimesh.creation.icosphere(subdivisions=subdivisions,radius=radius)
    m.apply_translation(centre)
    add(name,m,mat)

sphere('Body_sphere',CENTRE,R,CHROME,5)

def direction(h,v):
    return np.cos(v)*np.cos(h)*forward+np.cos(v)*np.sin(h)*right+np.sin(v)*up

def surface_patch(name,h0,v0,half_h,half_v,radial,mat,exponent=2.6, rings=15, segments=128):
    verts=[CENTRE+radial*direction(h0,v0)]
    faces=[]
    for ir in range(1,rings+1):
        t=ir/rings
        for j in range(segments):
            angle=2*np.pi*j/segments
            c,s=np.cos(angle),np.sin(angle)
            # superellipse: rounded square rather than a perfect ellipse
            x=np.sign(c)*abs(c)**(2/exponent)
            y=np.sign(s)*abs(s)**(2/exponent)
            h=h0+half_h*t*x; v=v0+half_v*t*y
            verts.append(CENTRE+radial*direction(h,v))
    for j in range(segments):
        faces.append([0,1+j,1+(j+1)%segments])
    for ir in range(1,rings):
        a=1+(ir-1)*segments; b=a+segments
        for j in range(segments):
            k=(j+1)%segments
            faces.extend([[a+j,b+j,b+k],[a+j,b+k,a+k]])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    # double sided where necessary by explicitly winding outward
    if np.dot(m.face_normals[0], direction(h0,v0)) < 0: m.invert()
    add(name,m,mat)

# Rounded capsule-mask: horizontal span 2*~1.24rad ~142 degrees along sphere circumference.
# Rounded corners and strong 30-degree upward pitch; intentionally NOT rectangular.
surface_patch('Mask_rounded_30deg',0,0,1.245,.49,1.020,BLACK,exponent=3.3)
# Radial layering ensures eye white and pupil stay in front of mask after edit-free import.
# Mask height fixed. Eye whites are larger; pupils exactly centred in local eye coordinates.
for side,theta in [('L',-.52),('R',.52)]:
    surface_patch(f'Eye_white_{side}',theta,0,.36,.375,1.037,EYE_WHITE,exponent=2.05)
    surface_patch(f'Pupil_centred_{side}',theta,0,.111,.122,1.052,PUPIL,exponent=2.0)

def swept_tube(name, control, radii, mat, segments=24, steps=36):
    # sampled cubic Bezier, with variable radius: integral ball-like root, neck, rounded club
    pts=[]; verts=[]; faces=[]
    P=np.asarray(control)
    for i in range(steps+1):
        t=i/steps
        pos=(1-t)**3*P[0]+3*(1-t)**2*t*P[1]+3*(1-t)*t*t*P[2]+t**3*P[3]
        dt=3*(1-t)**2*(P[1]-P[0])+6*(1-t)*t*(P[2]-P[1])+3*t*t*(P[3]-P[2])
        tangent=dt/np.linalg.norm(dt)
        transverse=np.cross(tangent, [0,1,0]); transverse/=np.linalg.norm(transverse)
        secondary=np.cross(tangent,transverse)
        # smooth profile through control points
        radius=float(PchipInterpolator([0,.12,.32,.50,.67,.80,.91,1.0],radii)(t))
        for j in range(segments):
            a=2*np.pi*j/segments
            verts.append(pos+radius*(np.cos(a)*transverse+np.sin(a)*secondary))
    for i in range(steps):
        for j in range(segments):
            a=i*segments+j;b=i*segments+(j+1)%segments
            c=(i+1)*segments+j;d=(i+1)*segments+(j+1)%segments
            faces.extend([[a,b,c],[b,d,c]])
    verts.extend([P[0],P[-1]])
    a,b=len(verts)-2,len(verts)-1
    for j in range(segments):
        faces.extend([[a,j,(j+1)%segments], [b,steps*segments+(j+1)%segments,steps*segments+j]])
    add(name,trimesh.Trimesh(vertices=verts,faces=faces,process=False),mat)

for sign,name in [(-1,'L'),(1,'R')]:
    # Continuous white rounded tapered moth-club stalk; rooted further back, near leg plane.
    # Separate antenna mesh retains a visible articulation seam at body.
    # Deepen the root into the sphere, while preserving the original external
    # club position. This prevents visible cracks when the antenna pivots.
    surface_root=np.array([sign*.64,.02,1.91])
    radial=(surface_root-CENTRE)/np.linalg.norm(surface_root-CENTRE)
    origin=surface_root-.17*radial
    control=[origin,
             surface_root+np.array([sign*.025,.025,.055]),
             surface_root+np.array([sign*.10,.055,.255]),
             surface_root+np.array([sign*.15,.075,.455])]
    swept_tube(f'Antenna_{name}_joint_and_club',control,
               [.096,.117,.076,.080,.143,.170,.133,.0],CHROME)

def smooth_min(a,b,k=.095):
    h=np.maximum(k-np.abs(a-b),0)/k
    return np.minimum(a,b)-h*h*k*.25

def sd_ellipsoid(X,Y,Z,c,rad):
    # sufficiently accurate for surface modelling with bounded elliptical volume
    q=np.sqrt(((X-c[0])/rad[0])**2+((Y-c[1])/rad[1])**2+((Z-c[2])/rad[2])**2)
    return (q-1)*min(rad)

# Each foot and leg is one watertight smooth mesh; no separate hip ball. The
# top end has a ball-like rounded shoulder that intersects the body at its side.
for sign,label in [(-1,'L'),(1,'R')]:
    step=.022
    xx=np.arange(.20,1.65,step)
    if sign<0: xx=np.arange(-1.65,-.20,step)
    yy=np.arange(-1.06,.67,step); zz=np.arange(-.10,.98,step)
    X,Y,Z=np.meshgrid(xx,yy,zz,indexing='ij')
    upper=sd_ellipsoid(X,Y,Z,[sign*.88,0,.58],[.185,.20,.21])
    lower=sd_ellipsoid(X,Y,Z,[sign*.91,-.035,.31],[.16,.175,.30])
    # Flatter foot, centre tucked inward beneath the body rather than splayed out.
    foot=sd_ellipsoid(X,Y,Z,[sign*.88,-.22,.205],[.53,.69,.225])
    sdf=smooth_min(smooth_min(upper,lower,.14),foot,.16)
    # Ground plane clips the underside of every SDF lobe, including the leg,
    # leaving a single genuinely planar bottom rather than a bulging intersection.
    # z=0 is the shared sole height.
    sdf=np.maximum(sdf, -Z)
    verts,faces,_,_=marching_cubes(sdf,level=0,spacing=(step,step,step))
    verts+=np.array([xx[0],yy[0],zz[0]])
    leg=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    add(f'Leg_{label}_continuous_ball_joint_and_foot',leg,CHROME)

scene=trimesh.Scene()
for key,mesh in parts.items():
    scene.add_geometry(mesh,node_name=key,geom_name=key)
scene.export(OUT)
print('Exported',OUT, 'bytes',OUT.stat().st_size)
print('Separate mesh objects:',', '.join(parts))
