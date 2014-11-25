package main

type hubman struct {
	//hubmap
	hubs map[int]*hub
}

var hm = hubman{
	hubs: make(map[int]*hub),
}

func (hm *hubman) get(id int) *hub {
	if _, exists := hm.hubs[id]; !exists {
		//@todo check hubs table before creating new

		//@todo if not in hubs table check if puzzle exists and load if not

		hm.hubs[id] = NewHub(id)
		go hm.hubs[id].run()
	}

	return hm.hubs[id]
}
