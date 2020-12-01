<script>
    import Header from "../../Layout/Header.svelte";
    import Aside from "../../Layout/Aside.svelte";
</script>
<Aside />

<main class="admin-main">
  <Header />
    <section class="admin-content p-2">

            <div class="mt-4 col-md-12" data-bind="using: filtro">
                <div class="row">
                    <div class="input-group col-md-3">
                        <select class="custom-select" title="Tipo de Atención" data-bind="options: $parent.tiposAtencion, 
                            optionsValue: 'id', 
                            optionsText: 'nombre', 
                            value: tipoAtencion">
                            <option value="A">Ambulatorio</option>
                            <option value="E">Emergencias</option>
                            <option value="H">Hospiitalizaciones</option>
                        </select>
                    </div>
                    <div class="mt-md-2 col-lg-2 col-md-4">
                        <label class="cstm-switch">
                            <input type="checkbox" name="option" data-bind="checked: filtrar" class="cstm-switch-input">
                            <span class="cstm-switch-indicator"></span>
                            <span class="cstm-switch-description">Solo mis notas </span>
                        </label>
                    </div>
                    <div class="col-md-5">
                        <div class="input-group input-group-flush mb-3">
                            <input data-bind="textInput: busqueda" type="search" class="form-control form-control-appended" placeholder="Buscar">
                            <div class="input-group-append">
                                <div class="input-group-text" data-bind="class: ($root.estado() == 'loading') ? 'd-none': ''">
                                    <span class="mdi mdi-magnify"></span>
                                </div>
                                <div class="input-group-text d-none" data-bind="class: ($root.estado() != 'loading') ? 'd-none': ''">
                                    <span class="mdi mdi-spin mdi-loading"></span>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <a class="btn ml-2 mr-2 ml-3 btn-primary" style="height: 35px;" data-toggle="collapse" href="#collapseExample" role="button" aria-expanded="false" aria-controls="collapseExample">
                        <i class="mdi mdi-filter"></i> Filtrar
                    </a>
                    <div class="col-lg-12" style="padding-top: 0 !important; margin-top: 0 !important;">
                        <div class="collapse" id="collapseExample">
                            <div class="card card-body">
                                <div class="row">
                                    <div class="form-group  col-lg-3">
                                        <label for="">Desde</label>
                                        <input type="date" data-bind="textInput: desde" class="form-control">
                                    </div>
                                    <div class="form-group  col-lg-3">
                                        <label for="">Hasta</label>
                                        <input type="date" data-bind="textInput: hasta" class="form-control">
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="option-box">
                                            <input id="radio-new1" name="bigradios" value="A" data-bind="checked: estado" type="radio">
                                            <label for="radio-new1">
                                                <span class="radio-content">
                                                    <span class="d-block">Atenciones activas</span>
                                                </span>
                                            </label>
                                        </div>
                                        <div class="option-box ml-3">
                                            <input id="radio-new2" name="bigradios" value="E" data-bind="checked: estado" type="radio">
                                            <label for="radio-new2">
                                                <span class="radio-content">
                                                    <span class="d-block">Atenciones cerradas</span>
                                                </span>
                                            </label>
                                        </div>
                                        <div class="option-box ml-3">
                                            <input id="radio-new3" name="bigradios" value="*" data-bind="checked: estado" type="radio">
                                            <label for="radio-new3">
                                                <span class="radio-content">
                                                    <span class="d-block">Todas</span>
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    
            <div class="col-md-12 m-b-30">
                <div class="table-responsive">
                    <table class="table align-td-middle table-card">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Edad</th>
                                <th>Sexo</th>
                                <th>Fecha de Ingreso</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: atenciones">
                            <tr>
                                <td>
                                    <div class="avatar avatar-sm mr-2 d-block-sm">
                                        <div class="avatar avatar-sm">
                                            <span class="avatar-title rounded-circle " data-bind="text: nombres[0] + primerApellido[0]">FD</span>
                                        </div>
    
                                    </div> <span data-bind="text: nombres + ' ' + primerApellido">Fiordaliza De Jesus</span>
                                </td>
                                <td data-bind="text: edad">49 años</td>
                                <td data-bind="text: sexo">F</td>
                                <td data-bind="text: new Date(fechaIngreso).toLocaleString('es-Do')">4/5/2020 1:31:00 p.&nbsp;m.</td>
    
                                <td style="text-align: right;">
                                    <div style="width: 150px;" class="ml-auto">
                                        <a data-target="#modalNuevaAtencion" data-placement="top" title="Iniciar consulta" class="icon-table" href="/AtencionMedica/Trabajar/1#resumen-page"><i class=" mdi-24px mdi mdi-open-in-new"></i></a>
                                    </div>
                                </td>
                            </tr>
            
                        </tbody>
                    </table>
    
                </div>
            </div>
    
    </section>
</main>