function Start():void{
	SF.createPlayer("Neutral", [.3,.3,.3]);
	SF.createPlayer("Charles", [.6,.75,1]);
	SF.createPlayer("Seb", [1,.5,.5]);
	SF.createTilesGrid(SF.gridXSize, SF.gridZSize);
	Camera.mainCamera.transform.position.x = SF.gridXSize/2 ;
	Camera.mainCamera.transform.position.z = SF.gridZSize/2 ;
}

function Update():void{
	if(Input.GetMouseButtonUp(0)){
		SF.SelectObject();
	}
	if(Input.anyKeyDown){
		if(Input.GetKeyDown(KeyCode.LeftArrow)){
			if(!SF.IsOutOfBounds('x', -.5)){
				Camera.mainCamera.transform.position.x -= .5 ;
			}
		} else if ( Input.GetKeyDown(KeyCode.RightArrow) ){
			if(!SF.IsOutOfBounds('x', .5)){
				Camera.mainCamera.transform.position.x += .5 ;
			}
		} else if ( Input.GetKeyDown(KeyCode.UpArrow) ){
			if(!SF.IsOutOfBounds('z', .5)){
				Camera.mainCamera.transform.position.z += .5 ;
			}
		} else if ( Input.GetKeyDown(KeyCode.DownArrow) ){
			if(!SF.IsOutOfBounds('z', -.5)){
				Camera.mainCamera.transform.position.z -= .5 ;
			}
		}
	}
}

static class SF {
	public var gridXSize : int = 40 ;
	public var gridZSize : int = 40 ;
	public var aGrid : Array = [];
	public var aTiles : Array = [];
	public var aTowers : Array = [];
	public var aFortresses : Array = [];
	public var aPlayers : Array = [];
	public var lastPlayer : int = 1 ;
	public var InfluenceArray = [null, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4];

	public function IsOutOfBounds(axis:String, coords: float):boolean{
		return false ;
	}
	
	public function SelectObject():void{
		var hit : RaycastHit;
		var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
		if( Physics.Raycast(ray, hit, 5000.0) ){
			var select : GameObject = hit.collider.gameObject ;
			select.transform.tag = "selected" ;
			var go : MonoBehaviour = select.GetComponent(TileBehaviour);
			if(go != null && go.type == "Tile"){
				SF.createTower(SF.aPlayers[SF.lastPlayer], hit.collider.transform.position.x, hit.collider.transform.position.z);
			}
		}
	}
	
	public function createTilesGrid(xs:int, zs:int):void{
		for(i=0; i<xs; i++){
			SF.aGrid[i] = new Array();
			for(j=0; j<zs; j++){
				var tile : GameObject = SF.CreateTile(i,j);
				SF.aTiles.push(tile);
				SF.aGrid[i][j] = tile ;
			}
		}
	}
	
	public function createGrass(xc:int, zc:int):void{
		var tile:GameObject = SF.aGrid[xc][zc];
		var gtile:MonoBehaviour = tile.GetComponent(TileBehaviour);
		gtile.sprite = GameObject.CreatePrimitive(PrimitiveType.Plane);
		gtile.sprite.transform.position = Vector3(xc-.35, .7, zc-.35) ;
		gtile.sprite.transform.localScale.x *= .15 ;
		gtile.sprite.transform.localScale.z *= .15 ;
		gtile.sprite.transform.localScale.y *= .15 ;
		gtile.sprite.transform.Rotate(60,225,0);
		gtile.sprite.renderer.material.shader = Shader.Find("Self-Illumin/Transparent/Cutout/Diffuse") as Shader;
		gtile.sprite.renderer.material.mainTexture = Resources.Load("Sprites/Herbe/grass_" + Mathf.Floor(Random.Range(1,9))) as Texture;
		gtile.sprite.collider.enabled = false ;
		gtile.sprite.renderer.material.mainTexture.wrapMode = TextureWrapMode.Clamp ;
	}
	
	public function createTower(player:Object, xc:int, zc:int):GameObject{
		if( !SF.isTileOccupied(xc, zc) && !SF.isTileBelongToEnnemy(xc, zc, player) ){
			var tile :GameObject = SF.aGrid[xc][zc];
			var gtile : MonoBehaviour = tile.GetComponent(TileBehaviour);
			var tower : GameObject = GameObject.CreatePrimitive(PrimitiveType.Plane);
			tower.AddComponent(TowerBehaviour);
			var gtower : MonoBehaviour  = tower.GetComponent(TowerBehaviour);
			gtower.id = SF.aTowers.length+1 ;
			gtile.allegiance = player ;
			gtower.player = player ;
			tower.transform.position = Vector3(xc-.35,.75,zc-.35);
			gtower.position = Vector3(xc, 0, zc);
			tower.transform.localScale.x *= .15 ;
			tower.transform.localScale.z *= .15 ;
			tower.transform.localScale.y *= .15 ;
			tower.transform.Rotate(60,225,0);
			tower.renderer.material.shader = Shader.Find("Self-Illumin/Transparent/Cutout/Diffuse") as Shader ;
			tower.renderer.material.mainTexture = Resources.Load("Sprites/Fortress_"+ player.id +"/tower") as Texture;
			tower.collider.enabled = false ;
			tower.layer = 2 ;
			gtower.size = 1 ;
			tower.renderer.material.mainTexture.wrapMode = TextureWrapMode.Clamp ;
			SF.aGrid[xc][zc].GetComponent(TileBehaviour).occupied = true ;
			SF.aGrid[xc][zc].GetComponent(TileBehaviour).tower = tower ;
			SF.ComputeConstructions(tower);
			SF.lastPlayer = (SF.lastPlayer == 1)? 2 : 1 ;
			SF.aTowers.push(tower);
			SF.ComputeInfluence();
			return tower ;
		} else {
			Debug.Log("Can't build here");
		}
	}
	
	public function isTileOccupied(xc:int, zc:int):boolean{
		if(SF.aGrid[xc][zc].GetComponent(TileBehaviour).occupied == true){
			return true ;
		} else {
			return false ;
		}
	}
	
	public function isTileBelongToEnnemy(xc:int, zc:int, player:Object):boolean{
		for(var tile : GameObject in SF.aTiles){
			if( tile.transform.position.x == xc && tile.transform.position.z == zc ){
				var gtile = tile.GetComponent(TileBehaviour);
				if( gtile.allegiance == null || gtile.allegiance.id != null && gtile.allegiance.id == player.id ){
					return false ;
				} else {
					return true ;
				}
			}
		}
	}
	
	public function createPlayer(name:String, color:Array ):void{
		var player : Player = new Player() ;
		player.id = SF.aPlayers.length ;
		player.name = name ;
		player.color = Color(color[0], color[1], color[2]);
		SF.aPlayers.push(player);
	}
	
	
	
	public function ComputeInfluence():void{
		for(var ax : int = 0 ; ax < SF.gridXSize ; ax ++){
			for(var az : int = 0 ; az < SF.gridZSize ; az++ ){
				var qtile : GameObject = SF.aGrid[ax][az];
				var qgtile : MonoBehaviour = qtile.GetComponent(TileBehaviour);
				if( !qgtile.occupied ){
					qgtile.allegiance = null ;
					qgtile.renderer.material.color = qtile.renderer.material.color = Color.white ;
				}
			}
		}
		for( var tower : GameObject in SF.aTowers ){
			if( tower != null ){
				var gtower:MonoBehaviour = tower.GetComponent(TowerBehaviour);		
				var size:int = gtower.size ;
				var xsubber:int = SF.InfluenceArray[size] ;
				var xadder:int = SF.InfluenceArray[size] ;
				var zsubber:int = SF.InfluenceArray[size] ;
				var zadder:int = SF.InfluenceArray[size] ;
				if(gtower.position.x == xsubber - 1){
					xsubber = 0 ;
				}
				if(gtower.position.x == SF.gridXSize - xadder){
					xadder = 0 ;
				}
				if(gtower.position.z == zsubber - 1){
					zsubber = 0 ;
				}
				if(gtower.position.z == SF.gridZSize - zadder){
					zadder = 0 ;
				}
				for(var ix : int = gtower.position.x - xsubber ; ix <= gtower.position.x + (size-1) + xadder ; ix ++){
					for(var iz : int = gtower.position.z - zsubber ; iz <= gtower.position.z + (size-1) + zadder ; iz++ ){
						var tile:GameObject = SF.aGrid[ix][iz];
						var gtile : MonoBehaviour = tile.GetComponent(TileBehaviour);
						if( gtile.allegiance != null && gtile.allegiance.id != gtower.player.id ){
							if( gtile.occupied ){
								SF.DestroyTower(gtile.tower);
								return ;
							}
						}
					}
				}
				for(var jx : int = gtower.position.x - xsubber ; jx <= gtower.position.x + (size-1) + xadder ; jx ++){
					for(var jz : int = gtower.position.z - zsubber ; jz <= gtower.position.z + (size-1) + zadder ; jz++ ){
						var jtile:GameObject = SF.aGrid[jx][jz];
						jtile.renderer.material.color = Color.magenta ;
						var jgtile : MonoBehaviour = jtile.GetComponent(TileBehaviour);
						if( jgtile.allegiance != null && jgtile.allegiance.id != gtower.player.id ){
							if( jgtile.occupied ){
								SF.DestroyTower(jgtile.tower);
								return ;
							} else {
								jgtile.sprite.renderer.material.color = jtile.renderer.material.color = Color(.5,.5,.5) ;
								jgtile.allegiance = SF.aPlayers[0];
							}
						} else {
							jgtile.sprite.renderer.material.color = jtile.renderer.material.color = gtower.player.color ;
							jgtile.allegiance = gtower.player ;
						}
					}
				}
			}
		}
	}
	
	public function DestroyTower(tower:GameObject):void{
		var gtower:MonoBehaviour = tower.GetComponent(TowerBehaviour);
		var tile:GameObject = SF.aGrid[gtower.position.x][gtower.position.z];
		var gtile: MonoBehaviour = tile.GetComponent(TileBehaviour);
		gtile.occupied = false ;
		gtile.allegiance = null ;
		gtile.sprite.renderer.material.color = tile.renderer.material.color = Color.white ;
		SF.aTowers[gtower.id-1] = null;
		GameObject.Destroy(gtile.tower);
		gtile.tower = null ;
		SF.ComputeInfluence();
	}
	
	public function ComputeConstructions(tower:GameObject):void{
		var aSelectedTowers : Array ;
		var gtower:MonoBehaviour = tower.GetComponent(TowerBehaviour);
		var xc = gtower.position.x ;
		var zc = gtower.position.z ;
		var result_1:Array = IsAlliedTowerIsOn('x', xc, zc, 5, gtower.player.id, false);
		var result_2:Array;
		var xtile:MonoBehaviour;
		if( result_1[0] != false ){
			result_2 = IsAlliedTowerIsOn('z', zc, xc, result_1[0], gtower.player.id, true);
			if( result_2[0] != false ){
				xtile = SF.aGrid[xc-result_1[0]][zc-result_2[0]].GetComponent(TileBehaviour);
				if( xtile.occupied ){
					if( xtile.tower.GetComponent(TowerBehaviour).player.id == gtower.player.id ){
						SF.ConstructFortress([tower, result_1[1], result_2[1], xtile.tower], result_2[0]);
					}
				}
			}
		} else {
			result_1 = IsAlliedTowerIsOn('z', zc, xc, 5, gtower.player.id, false) ;
			if( result_1[0] != false ){
				result_2 = IsAlliedTowerIsOn('x', xc, zc, result_1[0], gtower.player.id, true);
				if( result_2[0] != false ){
					xtile = SF.aGrid[xc-result_2[0]][zc-result_1[0]].GetComponent(TileBehaviour);
					if( xtile.occupied ){
						if( xtile.tower.GetComponent(TowerBehaviour).player.id == gtower.player.id ){
							SF.ConstructFortress([tower, result_1[1], result_2[1], xtile.tower], result_2[0]);
						}
					}
				}
			}
		}
	}
	
	public function ConstructFortress(towers:Array, size:int):void{
		var minx : int = SF.gridXSize ;
		var minz : int = SF.gridZSize ;
		var mint : int ;
		var coeffs : Array = [null, [1.65, .3, .3], [2.25,.4,.4], [3.1, .55, .55], [3.95, .7, .7], [4.8, .85, .85]];
		var i : int = 0 ;
		for(var tow in towers){
			var t : MonoBehaviour = tow.GetComponent(TowerBehaviour);
			if( t.position.x <= minx && t.position.z <= minz ){
				minx = t.position.x ;
				minz = t.position.z ;
				mint = i ;
			}
			i ++ ;
		}
		var fortress = towers[mint];
		size = Mathf.Abs(size);
		var gtower : MonoBehaviour = fortress.GetComponent(TowerBehaviour);
		fortress.renderer.material.mainTexture = Resources.Load("Sprites/Fortress_"+ gtower.player.id +"/fortress_" + (size+1)) as Texture;
		fortress.collider.enabled = false ;
		fortress.transform.position.y = coeffs[size][0] ;
		fortress.transform.localScale.x = coeffs[size][1] ;
		fortress.transform.localScale.z = coeffs[size][2] ;
		fortress.layer = 2 ;
		gtower.size = size + 1 ;
		for( var j : int = 0 ; j < towers.length ; j ++ ){
			if(j != mint){
				SF.DestroyTower(towers[j]);
			}
		}
		SF.ComputeInfluence();
	}
	
	public function IsAlliedTowerIsOn(axis:String, centerpoint:int, reference:int, limit:int, pid:int, exact:boolean):Array{
		var separation : int ;
		var subber : int = limit ;
		if(axis == "x"){
			var xtile : MonoBehaviour;
			var xtower : MonoBehaviour;
			if( exact ){
				if(centerpoint-limit > 0){
					xtile = SF.aGrid[centerpoint - limit][reference].GetComponent(TileBehaviour);
					if( xtile.occupied ){
						xtower = xtile.tower.GetComponent(TowerBehaviour);
						if( xtower.player.id == pid ){
							separation = centerpoint - xtile.position.x ;
							return [separation, xtile.tower];
						}
					}
				}
				if( centerpoint+limit < SF.gridXSize ) {
					xtile = SF.aGrid[centerpoint + limit][reference].GetComponent(TileBehaviour);
					if( xtile.occupied ){
						xtower = xtile.tower.GetComponent(TowerBehaviour);
						if( xtower.player.id == pid ){
							separation = centerpoint - xtile.position.x ;
							return [separation, xtile.tower];
						}
					}
				} 
				return [false];
			} else {
				if( centerpoint - limit < 0 ){
					subber = limit + (centerpoint-limit) ;
				}
				for(var ix:int = centerpoint - subber ; ix <= SF.gridXSize ; ix ++ ){
					if( ix > centerpoint + limit ){
						break;
					} else if( ix != centerpoint ){
						xtile = SF.aGrid[ix][reference].GetComponent(TileBehaviour);
						if( xtile.occupied ){
							xtower = xtile.tower.GetComponent(TowerBehaviour);
							if( xtower.player.id == pid ){
								separation = centerpoint - xtile.position.x ;
								return [separation, xtile.tower];
							} 
						}
					}
				}
			}
			return [false];
		} else {
			var ztile : MonoBehaviour;
			var ztower : MonoBehaviour;
			if( exact ){
				if(centerpoint-limit > 0){
					ztile = SF.aGrid[reference][centerpoint - limit].GetComponent(TileBehaviour);
					if( ztile.occupied ){
						ztower = ztile.tower.GetComponent(TowerBehaviour);
						if( ztower.player.id == pid ){
							separation = centerpoint - ztile.position.z ;
							return [separation, ztile.tower];
						}
					}
				}
				if( centerpoint+limit < SF.gridZSize) {
					ztile = SF.aGrid[reference][centerpoint + limit].GetComponent(TileBehaviour);
					if( ztile.occupied ){
						ztower = ztile.tower.GetComponent(TowerBehaviour);
						if( ztower.player.id == pid ){
							separation = centerpoint - ztile.position.z ;
							return [separation, ztile.tower];
						}
					}
				} 
				return [false];
			} else {
				if( centerpoint - limit < 0 ){
					subber = limit + (centerpoint-limit) ;
				}
				for(var iz:int = centerpoint - subber ; iz <= SF.gridZSize ; iz ++ ){
					if( iz > centerpoint + limit ){
						break;
					} else if( iz != centerpoint ){
						ztile = SF.aGrid[reference][iz].GetComponent(TileBehaviour);
						if( ztile.occupied ){
							ztower = ztile.tower.GetComponent(TowerBehaviour);
							if( ztower.player.id == pid ){
								separation = centerpoint - ztile.position.z ;
								return [separation, ztile.tower];
							} 
						}
					}
				}
			}
			return [false];
		}
	}
	
	public function CreateTile(xc:int, zc:int):GameObject{
		var tile : GameObject = GameObject.CreatePrimitive(PrimitiveType.Plane);
		tile.AddComponent(TileBehaviour);
		tile.transform.localScale.x *= .1 ;
		tile.transform.localScale.z *= .1 ;
		tile.collider.enabled = true ;
		tile.GetComponent(TileBehaviour).position = tile.transform.position = Vector3(xc, 0, zc);
		tile.renderer.material.shader = Shader.Find("Self-Illumin/Transparent/Cutout/Diffuse") as Shader;
		tile.renderer.material.color = ((xc+zc)%2 == 0)? Color.black : Color.white ;
		var gtile:MonoBehaviour = tile.GetComponent(TileBehaviour);
		gtile.sprite = GameObject.CreatePrimitive(PrimitiveType.Plane);
		gtile.sprite.transform.position = Vector3(xc-.35, .7, zc-.35) ;
		gtile.sprite.transform.localScale.x *= .15 ;
		gtile.sprite.transform.localScale.z *= .15 ;
		gtile.sprite.transform.localScale.y *= .15 ;
		gtile.sprite.transform.Rotate(60,225,0);
		gtile.sprite.renderer.material.shader = Shader.Find("Self-Illumin/Transparent/Cutout/Diffuse") as Shader;
		gtile.sprite.renderer.material.mainTexture = Resources.Load("Sprites/Herbe/grass_" + Mathf.Floor(Random.Range(1,9))) as Texture;
		gtile.sprite.collider.enabled = false ;
		gtile.sprite.renderer.material.mainTexture.wrapMode = TextureWrapMode.Clamp ;
		return tile ;
	}
}



class TileBehaviour extends MonoBehaviour {
	public var type : String = "Tile" ;
	public var position : Vector3 ;
	public var allegiance : Player ;
	public var occupied : boolean = false ;
	public var tower : GameObject ;
	public var sprite : GameObject ;
}

class TowerBehaviour extends MonoBehaviour{
	public var player : Object ;
	public var position : Vector3 ;
	public var type : String = "Tower" ;
	public var size : int ;
	public var id : int ;
}


class Player {
	public var id:int;
	public var name:String ;
	public var color:Color ;
}



